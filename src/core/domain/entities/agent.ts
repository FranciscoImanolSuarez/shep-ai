export type AgentProvider = 'openai' | 'anthropic' | 'ollama'
export type ToolChoice = 'auto' | 'required' | 'none'

export interface AgentConfig {
  maxSteps: number
  temperature: number
  toolChoice: ToolChoice
}

export interface Agent {
  id: string
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
}
