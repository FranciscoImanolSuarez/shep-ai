import type { Trace, TraceStatus } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'

export interface ListTracesFilter {
  workspaceId: string
  agentId?: string
  workflowId?: string
  status?: TraceStatus
  startedAfter?: Date
  startedBefore?: Date
  limit?: number
  cursor?: string
}

export interface TraceStorePort {
  insertTrace(
    trace: Omit<Trace, 'durationMs' | 'endedAt' | 'totalInputTokens' | 'totalOutputTokens' | 'totalCostUsd' | 'spanCount'>,
  ): Promise<void>

  updateTraceRollup(
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
  ): Promise<void>

  insertSpansBatch(spans: Span[]): Promise<void>

  listTraces(filter: ListTracesFilter): Promise<Trace[]>

  getTrace(workspaceId: string, traceId: string): Promise<Trace | null>

  getSpansForTrace(traceId: string): Promise<Span[]>
}
