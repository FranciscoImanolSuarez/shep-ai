export type AgentProvider = 'openai' | 'anthropic' | 'ollama'
export type ToolChoice = 'auto' | 'required' | 'none'

export interface AgentConfig {
  maxSteps: number
  temperature: number
  toolChoice: ToolChoice
  maxDelegationDepth: number
  /**
   * P1.4 — Optional cost ceiling per run measured in TOTAL tokens (input+output)
   * summed across steps. When the cumulative usage crosses this threshold, the
   * tool loop stops before the next step. Coarse but predictable: a 1-step run
   * over a huge document can cost as much as 10 cheap steps; `maxSteps` alone
   * does not bound that.
   */
  tokenBudget?: number
  /**
   * P1.2 — When true, the use case fetches the agent's last few completed
   * executions and prepends a compact summary to the system prompt at run time.
   * Simple injection — no semantic recall, no embeddings. Default off.
   */
  memoryEnabled?: boolean
}

export interface Agent {
  id: string
  knowledgeBaseId?: string | null
  name: string
  description: string
  systemPrompt: string
  model: string
  provider: AgentProvider
  toolIds: string[]
  config: AgentConfig
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxSteps: 10,
  temperature: 0.7,
  toolChoice: 'auto',
  maxDelegationDepth: 3,
}
