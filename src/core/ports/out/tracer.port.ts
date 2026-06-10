import type { SpanKind, SpanStatus, TraceStatus } from '@/core/domain/entities/trace'
import type { SpanEvent } from '@/core/domain/entities/span'

export interface TraceContext {
  traceId: string
  workspaceId: string
}

export interface StartSpanInput {
  name: string
  kind: SpanKind
  parentSpanId?: string
  attributes?: Record<string, unknown>
}

export interface EndSpanInput {
  spanId: string
  status: SpanStatus
  statusMessage?: string
  attributes?: Record<string, unknown>
  inputTokens?: number
  outputTokens?: number
  costUsd?: string
}

export interface TracerPort {
  startTrace(input: {
    workspaceId: string
    rootKind: 'agent' | 'workflow'
    agentExecutionId?: string
    workflowRunId?: string
    attributes?: Record<string, unknown>
  }): Promise<TraceContext>

  startSpan(ctx: TraceContext, input: StartSpanInput): { spanId: string }

  endSpan(ctx: TraceContext, input: EndSpanInput): void

  addEvent(ctx: TraceContext, spanId: string, event: SpanEvent): void

  finishTrace(ctx: TraceContext, input: { status: TraceStatus; statusMessage?: string }): Promise<void>
}
