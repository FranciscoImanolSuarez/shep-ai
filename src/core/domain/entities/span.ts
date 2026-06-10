export interface SpanEvent {
  name: string
  ts: string
  attrs?: Record<string, unknown>
}

export interface Span {
  id: string
  traceId: string
  parentSpanId?: string
  name: string
  kind: import('./trace').SpanKind
  status: import('./trace').SpanStatus
  statusMessage?: string
  startedAt: Date
  endedAt: Date
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  costUsd?: string // numeric -> string via Drizzle
  attributes: Record<string, unknown>
  events: SpanEvent[]
}
