import type { Agent } from '@/core/domain/entities/agent'
import type { AgentExecution } from '@/core/domain/entities/agent-execution'
import type { Message } from '@/core/domain/entities/message'

export interface CreateAgentInput {
  name: string
  description: string
  systemPrompt: string
  model: string
  provider: Agent['provider']
  toolIds?: string[]
  config?: Partial<Agent['config']>
  metadata?: Record<string, unknown>
}

export interface UpdateAgentInput {
  name?: string
  description?: string
  systemPrompt?: string
  model?: string
  provider?: Agent['provider']
  toolIds?: string[]
  config?: Partial<Agent['config']>
  metadata?: Record<string, unknown>
}

export interface RunAgentInput {
  agentId: string
  messages: Message[]
  context?: Record<string, unknown>
}

export interface AgentPort {
  // CRUD
  createAgent(input: CreateAgentInput): Promise<Agent>
  updateAgent(id: string, input: UpdateAgentInput): Promise<Agent>
  deleteAgent(id: string): Promise<void>
  listAgents(): Promise<Agent[]>
  getAgent(id: string): Promise<Agent | null>

  // Execution
  runAgent(input: RunAgentInput): Promise<ReadableStream>
  getExecution(id: string): Promise<AgentExecution | null>
  getExecutions(agentId: string, limit?: number): Promise<AgentExecution[]>
}
