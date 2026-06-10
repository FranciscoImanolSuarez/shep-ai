import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm'
import type { TraceStorePort, ListTracesFilter } from '@/core/ports/out/trace-store.port'
import type { Trace, TraceStatus } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'
import type { SpanKind, SpanStatus } from '@/core/domain/entities/trace'
import { traces, spans, agentExecutions, workflowRuns } from './schema'
import type { Database } from './connection'

type TraceRow = typeof traces.$inferSelect
type SpanRow = typeof spans.$inferSelect

function toTraceDomain(row: TraceRow): Trace {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    rootSpanId: row.rootSpanId,
    rootKind: row.rootKind as 'agent' | 'workflow',
    status: row.status as TraceStatus,
    durationMs: row.durationMs ?? undefined,
    totalInputTokens: row.totalInputTokens,
    totalOutputTokens: row.totalOutputTokens,
    totalCostUsd: row.totalCostUsd as string,
    spanCount: row.spanCount,
    agentExecutionId: row.agentExecutionId ?? undefined,
    workflowRunId: row.workflowRunId ?? undefined,
    attributes: (row.attributes ?? {}) as Record<string, unknown>,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? undefined,
  }
}

function toSpanDomain(row: SpanRow): Span {
  return {
    id: row.id,
    traceId: row.traceId,
    parentSpanId: row.parentSpanId ?? undefined,
    name: row.name,
    kind: row.kind as SpanKind,
    status: row.status as SpanStatus,
    statusMessage: row.statusMessage ?? undefined,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationMs: row.durationMs,
    inputTokens: row.inputTokens ?? undefined,
    outputTokens: row.outputTokens ?? undefined,
    costUsd: row.costUsd !== null ? (row.costUsd as string) : undefined,
    attributes: (row.attributes ?? {}) as Record<string, unknown>,
    events: (row.events ?? []) as Span['events'],
  }
}

export class TraceStoreAdapter implements TraceStorePort {
  constructor(private readonly db: Database) {}

  async insertTrace(
    trace: Omit<Trace, 'durationMs' | 'endedAt' | 'totalInputTokens' | 'totalOutputTokens' | 'totalCostUsd' | 'spanCount'>,
  ): Promise<void> {
    await this.db.insert(traces).values({
      id: trace.id,
      workspaceId: trace.workspaceId,
      rootSpanId: trace.rootSpanId,
      rootKind: trace.rootKind,
      status: trace.status,
      // rollup fields start at defaults
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: '0',
      spanCount: 0,
      agentExecutionId: trace.agentExecutionId ?? null,
      workflowRunId: trace.workflowRunId ?? null,
      attributes: trace.attributes,
      startedAt: trace.startedAt,
    })
  }

  async updateTraceRollup(
    traceId: string,
    rollup: {
      status: TraceStatus
      durationMs: number
      totalInputTokens: number
      totalOutputTokens: number
      totalCostUsd: string
      spanCount: number
      endedAt: Date
    },
  ): Promise<void> {
    await this.db
      .update(traces)
      .set({
        status: rollup.status,
        durationMs: rollup.durationMs,
        totalInputTokens: rollup.totalInputTokens,
        totalOutputTokens: rollup.totalOutputTokens,
        totalCostUsd: rollup.totalCostUsd,
        spanCount: rollup.spanCount,
        endedAt: rollup.endedAt,
      })
      .where(eq(traces.id, traceId))
  }

  async insertSpansBatch(spansToInsert: Span[]): Promise<void> {
    if (spansToInsert.length === 0) return

    await this.db.insert(spans).values(
      spansToInsert.map((s) => ({
        id: s.id,
        traceId: s.traceId,
        parentSpanId: s.parentSpanId ?? null,
        name: s.name,
        kind: s.kind,
        status: s.status,
        statusMessage: s.statusMessage ?? null,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationMs: s.durationMs,
        inputTokens: s.inputTokens ?? null,
        outputTokens: s.outputTokens ?? null,
        costUsd: s.costUsd !== undefined ? s.costUsd : null,
        attributes: s.attributes,
        events: s.events,
      })),
    )
  }

  async listTraces(filter: ListTracesFilter): Promise<Trace[]> {
    const conditions = [eq(traces.workspaceId, filter.workspaceId)]

    if (filter.status) {
      conditions.push(eq(traces.status, filter.status))
    }
    if (filter.startedAfter) {
      conditions.push(gte(traces.startedAt, filter.startedAfter))
    }
    if (filter.startedBefore) {
      conditions.push(lte(traces.startedAt, filter.startedBefore))
    }
    if (filter.agentId) {
      conditions.push(
        inArray(
          traces.agentExecutionId,
          this.db
            .select({ id: agentExecutions.id })
            .from(agentExecutions)
            .where(eq(agentExecutions.agentId, filter.agentId)),
        ),
      )
    }
    if (filter.workflowId) {
      conditions.push(
        inArray(
          traces.workflowRunId,
          this.db
            .select({ id: workflowRuns.id })
            .from(workflowRuns)
            .where(eq(workflowRuns.workflowId, filter.workflowId)),
        ),
      )
    }

    const limit = filter.limit ?? 50

    const rows = await this.db
      .select()
      .from(traces)
      .where(and(...conditions))
      .orderBy(desc(traces.startedAt))
      .limit(limit)

    return rows.map(toTraceDomain)
  }

  async getTrace(workspaceId: string, traceId: string): Promise<Trace | null> {
    const [row] = await this.db
      .select()
      .from(traces)
      .where(and(eq(traces.id, traceId), eq(traces.workspaceId, workspaceId)))

    return row ? toTraceDomain(row) : null
  }

  async getSpansForTrace(traceId: string): Promise<Span[]> {
    const rows = await this.db
      .select()
      .from(spans)
      .where(eq(spans.traceId, traceId))
      .orderBy(spans.startedAt)

    return rows.map(toSpanDomain)
  }
}
