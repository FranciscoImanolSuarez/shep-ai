import { NextResponse } from 'next/server'
import { getEnv } from '@/config/env'
import { getContainer } from '@/config/container'
import { MODEL_REGISTRY, PROVIDER_DEFAULTS, getAvailableProviders, type ProviderId } from '@/config/models'

const PROVIDER_NAMES: Record<ProviderId, string> = {
  openai:    'OpenAI',
  anthropic: 'Anthropic',
  ollama:    'Ollama',
}

const MODELS_CACHE_KEY = 'models:providers'
const MODELS_CACHE_TTL = 3600 // 1 hour — static env-derived data

export async function GET() {
  const { cache } = getContainer()

  const cached = await cache.get<{ providers: unknown[] }>(MODELS_CACHE_KEY)
  if (cached) return NextResponse.json(cached)

  const env = getEnv()
  const available = getAvailableProviders(env)

  const providers = available.map((providerId) => {
    const defaultModel = PROVIDER_DEFAULTS[providerId]
    const models = MODEL_REGISTRY
      .filter((m) => m.provider === providerId)
      // Put default model first
      .sort((a, b) => {
        if (a.id === defaultModel) return -1
        if (b.id === defaultModel) return 1
        return 0
      })

    return {
      id: providerId,
      name: PROVIDER_NAMES[providerId],
      models,
    }
  })

  const payload = { providers }
  await cache.set(MODELS_CACHE_KEY, payload, MODELS_CACHE_TTL)
  return NextResponse.json(payload)
}
