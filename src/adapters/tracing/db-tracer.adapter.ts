import { randomBytes } from 'crypto'
import type { TracerPort, TraceContext, StartSpanInput, EndSpanInput } from '@/core/ports/out/tracer.port'
import type { TraceStorePort } from '@/core/ports/out/trace-store.port'
import type { Trace, TraceStatus, SpanKind, SpanStatus } from '@/core/domain/entities/trace'
import type { Span, SpanEvent } from '@/core/domain/entities/span'

interface SpanBuffer {
  spanId: string
  name: string
  kind: SpanKind
  parentSpanId?: string
  status: SpanStatus
  statusMessage?: string
  startedAt: Date
  endedAt?: Date
  durationMs?: number
  inputTokens?: number
  outputTokens?: number
  costUsd?: string
  attributes: Record<string, unknown>
  events: SpanEvent[]
}

interface TraceBuffer {
  trace: {
    workspaceId: string
    rootKind: 'agent' | 'workflow'
    agentExecutionId?: string
    workflowRunId?: string
    attributes: Record<string, unknown>
    startedAt: Date
    // rootSpanId is set when the first span (root) is created
    rootSpanId?: string
  }
  spans: SpanBuffer[]
}

// Optional redaction hook — applied to span attributes before persistence
export type RedactionHook = (span: Span) => Span

export class DbTracerAdapter implements TracerPort {
  private readonly buffers = new Map<string, TraceBuffer>()

  constructor(
    private readonly traceStore: TraceStorePort,
    private readonly redactionHook?: RedactionHook,
  ) {}

  async startTrace(input: {
    workspaceId: string
    rootKind: 'agent' | 'workflow'
    agentExecutionId?: string
    workflowRunId?: string
    attributes?: Record<string, unknown>
  }): Promise<TraceContext> {
    const traceId = randomBytes(16).toString('hex') // 32-char hex, OTel-compatible

    this.buffers.set(traceId, {
      trace: {
        workspaceId: input.workspaceId,
        rootKind: input.rootKind,
        agentExecutionId: input.agentExecutionId,
        workflowRunId: input.workflowRunId,
        attributes: input.attributes ?? {},
        startedAt: new Date(),
      },
      spans: [],
    })

    return { traceId, workspaceId: input.workspaceId }
  }

  startSpan(ctx: TraceContext, input: StartSpanInput): { spanId: string } {
    const buffer = this.buffers.get(ctx.traceId)
    if (!buffer) {
      // Trace buffer not found — emit a no-op span ID so callers don't break
      return { spanId: randomBytes(8).toString('hex') }
    }

    const spanId = randomBytes(8).toString('hex') // 16-char hex, OTel-compatible

    // First span created for a trace becomes the root span
    if (!buffer.trace.rootSpanId) {
      buffer.trace.rootSpanId = spanId
    }

    const spanBuffer: SpanBuffer = {
      spanId,
      name: input.name,
      kind: input.kind,
      parentSpanId: input.parentSpanId,
      status: 'ok',
      startedAt: new Date(),
      attributes: input.attributes ?? {},
      events: [],
    }

    buffer.spans.push(spanBuffer)
    return { spanId }
  }

  endSpan(ctx: TraceContext, input: EndSpanInput): void {
    const buffer = this.buffers.get(ctx.traceId)
    if (!buffer) return

    const spanBuffer = buffer.spans.find((s) => s.spanId === input.spanId)
    if (!spanBuffer) return

    const endedAt = new Date()
    const durationMs = endedAt.getTime() - spanBuffer.startedAt.getTime()

    spanBuffer.endedAt = endedAt
    spanBuffer.durationMs = durationMs
    spanBuffer.status = input.status
    spanBuffer.statusMessage = input.statusMessage
    spanBuffer.inputTokens = input.inputTokens
    spanBuffer.outputTokens = input.outputTokens
    spanBuffer.costUsd = input.costUsd

    if (input.attributes) {
      spanBuffer.attributes = { ...spanBuffer.attributes, ...input.attributes }
    }
  }

  addEvent(ctx: TraceContext, spanId: string, event: SpanEvent): void {
    const buffer = this.buffers.get(ctx.traceId)
    if (!buffer) return

    const spanBuffer = buffer.spans.find((s) => s.spanId === spanId)
    if (!spanBuffer) return

    spanBuffer.events.push(event)
  }

  async finishTrace(ctx: TraceContext, input: { status: TraceStatus; statusMessage?: string }): Promise<void> {
    const buffer = this.buffers.get(ctx.traceId)
    if (!buffer) return

    try {
      const endedAt = new Date()
      const traceStartedAt = buffer.trace.startedAt
      const durationMs = endedAt.getTime() - traceStartedAt.getTime()

      // Compute rollup values from in-memory spans
      let totalInputTokens = 0
      let totalOutputTokens = 0
      let totalCostUsd = 0
      for (const span of buffer.spans) {
        totalInputTokens += span.inputTokens ?? 0
        totalOutputTokens += span.outputTokens ?? 0
        if (span.costUsd) {
          totalCostUsd += parseFloat(span.costUsd)
        }
      }

      // Determine the effective root span ID
      const rootSpanId = buffer.trace.rootSpanId ?? buffer.spans[0]?.spanId ?? 'unknown'

      // Build Trace object for insert
      const trace: Omit<Trace, 'durationMs' | 'endedAt' | 'totalInputTokens' | 'totalOutputTokens' | 'totalCostUsd' | 'spanCount'> = {
        id: ctx.traceId,
        workspaceId: ctx.workspaceId,
        rootSpanId,
        rootKind: buffer.trace.rootKind,
        status: 'running', // initial status before rollup update
        agentExecutionId: buffer.trace.agentExecutionId,
        workflowRunId: buffer.trace.workflowRunId,
        attributes: buffer.trace.attributes,
        startedAt: traceStartedAt,
      }

      // Build Span objects for batch insert
      const spansToInsert: Span[] = buffer.spans
        .filter((s) => s.endedAt !== undefined)
        .map((s): Span => {
          const span: Span = {
            id: s.spanId,
            traceId: ctx.traceId,
            parentSpanId: s.parentSpanId,
            name: s.name,
            kind: s.kind,
            status: s.status,
            statusMessage: s.statusMessage,
            startedAt: s.startedAt,
            endedAt: s.endedAt!,
            durationMs: s.durationMs!,
            inputTokens: s.inputTokens,
            outputTokens: s.outputTokens,
            costUsd: s.costUsd,
            attributes: s.attributes,
            events: s.events,
          }
          return this.redactionHook ? this.redactionHook(span) : span
        })

      // Flush: insert trace + batch insert spans in a single operation
      await this.traceStore.insertTrace(trace)
      await this.traceStore.insertSpansBatch(spansToInsert)

      // Update rollup
      await this.traceStore.updateTraceRollup(ctx.traceId, {
        status: input.status,
        durationMs,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd: totalCostUsd.toFixed(6),
        spanCount: spansToInsert.length,
        endedAt,
      })
    } catch (err) {
      // REQ-OBS-7: flush error MUST NOT propagate — log and continue
      console.error('[DbTracerAdapter] finishTrace flush error:', err)
    } finally {
      // Always clean up the in-memory buffer
      this.buffers.delete(ctx.traceId)
    }
  }
}
