import type { Trace } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'
import type { ListTracesFilter } from '@/core/ports/out/trace-store.port'

export interface ObservabilityPort {
  listTraces(filter: ListTracesFilter): Promise<Trace[]>
  getTrace(workspaceId: string, traceId: string): Promise<{ trace: Trace; spans: Span[] } | null>
}
