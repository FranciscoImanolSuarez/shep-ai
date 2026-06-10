import { NextResponse } from 'next/server'
import { getEnv } from '@/config/env'
import { MODEL_REGISTRY, PROVIDER_DEFAULTS, getAvailableProviders, type ProviderId } from '@/config/models'

const PROVIDER_NAMES: Record<ProviderId, string> = {
  openai:    'OpenAI',
  anthropic: 'Anthropic',
  ollama:    'Ollama',
}

export async function GET() {
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

  return NextResponse.json({ providers })
}
