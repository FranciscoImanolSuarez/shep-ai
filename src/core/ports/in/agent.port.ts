import type { z } from 'zod'
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
  knowledgeBaseId?: string | null
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
  knowledgeBaseId?: string | null
}

export interface RunAgentInput {
  agentId: string
  messages: Message[]
  context?: Record<string, unknown>
  parentExecutionId?: string
  delegationContext?: {
    depth: number
    chain: string[]
  }
  /**
   * P0.2 — Optional Zod schema for structured output. When provided, the agent's
   * final response is parsed as a JSON object matching this schema and returned
   * as `object`. Per-call only (not persisted on the agent). Only honored by
   * `runAgentToCompletion`; the streaming `runAgent` path ignores it.
   */
  outputSchema?: z.ZodType<unknown>
  /**
   * Per-call config overrides merged over the agent's stored config. Lets
   * callers (workflow nodes, scheduled runs) tune a run without persisting a
   * separate agent. Sensitive fields like maxDelegationDepth are excluded.
   */
  configOverrides?: Partial<Pick<Agent['config'], 'temperature' | 'maxSteps' | 'toolChoice' | 'tokenBudget' | 'memoryEnabled'>>
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
  runAgentToCompletion(input: RunAgentInput): Promise<{
    text: string
    /** P0.2 — typed structured output, present only when `input.outputSchema` was provided. */
    object?: unknown
    totalTokens: number
    inputTokens: number
    outputTokens: number
    costUsd: string
  }>
  getExecution(id: string): Promise<AgentExecution | null>
  getExecutions(agentId: string, limit?: number): Promise<AgentExecution[]>
}
