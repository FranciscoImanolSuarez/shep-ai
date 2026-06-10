import type { Env } from './env'

export type ProviderId = 'openai' | 'anthropic' | 'ollama'

export interface ModelEntry {
  id: string
  name: string
  provider: ProviderId
  contextWindow: number
  isDefault: boolean
}

export const MODEL_REGISTRY: ModelEntry[] = [
  { id: 'gpt-4o',                    name: 'GPT-4o',             provider: 'openai',    contextWindow: 128000, isDefault: true  },
  { id: 'gpt-4o-mini',               name: 'GPT-4o Mini',        provider: 'openai',    contextWindow: 128000, isDefault: false },
  { id: 'claude-sonnet-4-20250514',  name: 'Claude Sonnet 4',    provider: 'anthropic', contextWindow: 200000, isDefault: true  },
  { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5',   provider: 'anthropic', contextWindow: 200000, isDefault: false },
  { id: 'llama3.1',                  name: 'Llama 3.1',          provider: 'ollama',    contextWindow: 131072, isDefault: true  },
]

export const PROVIDER_DEFAULTS: Record<ProviderId, string> = {
  openai:    'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  ollama:    'llama3.1',
}

/** Returns providers whose API keys / base URLs are configured in env. */
export function getAvailableProviders(env: Partial<Env>): ProviderId[] {
  const available: ProviderId[] = []
  if (env.OPENAI_API_KEY)    available.push('openai')
  if (env.ANTHROPIC_API_KEY) available.push('anthropic')
  if (env.OLLAMA_BASE_URL)   available.push('ollama')
  return available
}

/** Returns the provider for a given model id, or null if not found in registry. */
export function getProviderForModel(modelId: string): ProviderId | null {
  return MODEL_REGISTRY.find((m) => m.id === modelId)?.provider ?? null
}

/** Validates that a model id exists in the registry under the given provider. */
export function validateModel(modelId: string, provider: ProviderId): boolean {
  return MODEL_REGISTRY.some((m) => m.id === modelId && m.provider === provider)
}
