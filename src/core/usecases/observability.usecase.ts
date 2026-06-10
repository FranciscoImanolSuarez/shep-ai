import type { ObservabilityPort } from '@/core/ports/in/observability.port'
import type { TraceStorePort, ListTracesFilter } from '@/core/ports/out/trace-store.port'
import type { Trace } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'

export class ObservabilityUseCase implements ObservabilityPort {
  constructor(private readonly traceStore: TraceStorePort) {}

  async listTraces(filter: ListTracesFilter): Promise<Trace[]> {
    return this.traceStore.listTraces(filter)
  }

  async getTrace(workspaceId: string, traceId: string): Promise<{ trace: Trace; spans: Span[] } | null> {
    const trace = await this.traceStore.getTrace(workspaceId, traceId)
    if (!trace) return null

    const spans = await this.traceStore.getSpansForTrace(traceId)

    // Sort spans by startedAt ASC
    const sortedSpans = [...spans].sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
    )

    return { trace, spans: sortedSpans }
  }
}
