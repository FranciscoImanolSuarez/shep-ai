export type EventType =
  | 'chat_message'
  | 'agent_run'
  | 'rag_query'
  | 'document_upload'
  | 'agent_delegation'
  // Workflow lifecycle events (T2.30)
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.deleted'
  | 'workflow.run.completed'
  | 'workflow.run.failed'

export interface AuditEvent {
  id: string
  userId: string
  eventType: EventType
  metadata: Record<string, unknown>
  tokenCount: number
  costUsd?: number
  createdAt: Date
}

// Blended (avg in+out) cost per 1K tokens in USD
export const MODEL_COST_PER_1K_TOKENS: Record<string, number> = {
  'gpt-4o': 0.01,               // $0.005 in / $0.015 out → avg $0.01
  'gpt-4o-mini': 0.000375,      // $0.00015 in / $0.0006 out → avg $0.000375
  'gpt-4-turbo': 0.02,          // $0.01 in / $0.03 out → avg $0.02
  'gpt-3.5-turbo': 0.001,       // $0.0005 in / $0.0015 out → avg $0.001
  'claude-sonnet-4-20250514': 0.009,  // $0.003 in / $0.015 out → avg $0.009
  'claude-3-5-sonnet-20241022': 0.009,
  'claude-3-haiku-20240307': 0.000625, // $0.00025 in / $0.00125 out → avg $0.000625
  'claude-opus-4': 0.0225,      // $0.015 in / $0.075 out → avg $0.045 / 2
}

export function computeCost(model: string, tokenCount: number): number | undefined {
  const normalized = model.toLowerCase()
  const key = Object.keys(MODEL_COST_PER_1K_TOKENS).find((k) =>
    normalized.includes(k) || k.includes(normalized),
  )
  if (!key) return undefined
  return (tokenCount / 1000) * MODEL_COST_PER_1K_TOKENS[key]
}
