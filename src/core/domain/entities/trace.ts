export type SpanKind = 'agent' | 'llm' | 'tool' | 'workflow' | 'workflow_node'
export type SpanStatus = 'ok' | 'error'
export type TraceStatus = 'running' | 'ok' | 'error'

export interface Trace {
  id: string
  workspaceId: string
  rootSpanId: string
  rootKind: 'agent' | 'workflow'
  status: TraceStatus
  durationMs?: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: string // numeric -> string via Drizzle
  spanCount: number
  agentExecutionId?: string
  workflowRunId?: string
  attributes: Record<string, unknown>
  startedAt: Date
  endedAt?: Date
}
