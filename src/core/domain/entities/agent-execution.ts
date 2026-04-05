import type { Message } from './message'

export type ExecutionStatus = 'running' | 'completed' | 'failed'

export interface AgentToolCall {
  toolName: string
  input: Record<string, unknown>
  output: unknown
}

export interface AgentStep {
  stepNumber: number
  text: string
  toolCalls: AgentToolCall[]
  tokensUsed: number
  finishReason: string
}

export interface AgentExecution {
  id: string
  agentId: string
  status: ExecutionStatus
  input: Message[]
  steps: AgentStep[]
  result?: string
  totalTokens: number
  parentExecutionId?: string
  createdAt: Date
  completedAt?: Date
}
