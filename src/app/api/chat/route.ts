import { streamText, type UIMessage } from 'ai'
import { getEnv } from '@/config/env'
import { getContainer } from '@/config/container'
import { auth } from '@/lib/auth'
import { computeCost } from '@/core/domain/entities/audit-event'
import {
  PROVIDER_DEFAULTS,
  getProviderForModel,
  getAvailableProviders,
  type ProviderId,
} from '@/config/models'
import type { Env } from '@/config/env'
import { getProviderModel } from '@/adapters/ai/model-factory'
import { extractTextFromParts } from '@/lib/ui-message'

/**
 * Resolves the effective provider for a given model id.
 * 1. Look up the model in the registry — provider comes from there.
 * 2. If not in registry, fall back to env.AI_PROVIDER.
 */
function resolveProviderForModel(modelId: string, envProvider: ProviderId): ProviderId {
  return getProviderForModel(modelId) ?? envProvider
}

function buildProviderModel(provider: ProviderId, modelId: string) {
  return getProviderModel(provider, modelId)
}

/**
 * Resolves model + provider from:
 *   1. Explicit model in request body
 *   2. Conversation record model field
 *   3. PROVIDER_DEFAULTS[AI_PROVIDER]
 *
 * Cross-provider: if the resolved model belongs to a different provider than
 * AI_PROVIDER, we use that provider's SDK directly — but only when that
 * provider has credentials configured. Conversations can carry a model from a
 * provider that is no longer configured (e.g. a gpt-* model saved while an
 * OpenAI key existed); calling it would error after the 200 response is sent
 * and the stream would die silently. Fall back to the env provider instead.
 */
function resolveModel(
  bodyModel: string | undefined,
  conversationModel: string | undefined,
  env: Env,
): { modelId: string; provider: ProviderId } {
  const envProvider = env.AI_PROVIDER as ProviderId
  const candidate = bodyModel || conversationModel || ''

  if (candidate) {
    const provider = resolveProviderForModel(candidate, envProvider)

    if (provider !== envProvider && !getAvailableProviders(env).includes(provider)) {
      console.warn(
        `[chat] Model ${candidate} needs provider ${provider} which has no credentials configured — falling back to ${envProvider}:${PROVIDER_DEFAULTS[envProvider]}`,
      )
      return { modelId: PROVIDER_DEFAULTS[envProvider], provider: envProvider }
    }

    // Warn if cross-provider
    if (provider !== envProvider) {
      console.warn(
        `[chat] Cross-provider model selected: ${candidate} (${provider}) while AI_PROVIDER=${envProvider}`,
      )
    }
    return { modelId: candidate, provider }
  }

  // No model specified — use default for configured provider
  return {
    modelId: PROVIDER_DEFAULTS[envProvider],
    provider: envProvider,
  }
}

function toModelMessages(messages: UIMessage[]) {
  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: extractTextFromParts(m.parts ?? []) || (m as unknown as { content?: string }).content || '',
  }))
}

const RICH_CONTENT_INSTRUCTIONS = `
You have access to rich content blocks that render visually in the UI. Use them when the user asks for data visualization, metrics, or diagrams.

CHART — Use a \`\`\`chart code block with JSON:
\`\`\`chart
{"type":"bar","title":"Sales","data":[{"label":"Jan","value":100},{"label":"Feb","value":200}]}
\`\`\`
Types: "bar", "line", "pie", "horizontal-bar". Fields: type, title?, data[].label, data[].value, data[].color?, xLabel?, yLabel?

METRICS — Use a \`\`\`metrics code block with JSON:
\`\`\`metrics
{"title":"Overview","metrics":[{"label":"Revenue","value":42500,"prefix":"$","change":12.5},{"label":"Users","value":1284,"change":-3.2}]}
\`\`\`
Fields: title?, metrics[].label, metrics[].value, metrics[].prefix?, metrics[].suffix?, metrics[].change? (percentage, shows trend arrow), metrics[].description?

SVG — Use a \`\`\`svg code block for custom graphics:
\`\`\`svg
<svg viewBox="0 0 200 100">...</svg>
\`\`\`

IMPORTANT: Always use these formats when the user asks for charts, graphs, metrics, dashboards, or visualizations. Output valid JSON inside chart/metrics blocks. Prefer chart blocks over SVG for data visualization.`

export async function POST(req: Request) {
  const session = await auth()
  const {
    messages,
    model: bodyModel,
    conversationId,
    systemPrompt,
    useRag,
    knowledgeBaseId,
  } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages must be a non-empty array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const env = getEnv()

  // Resolve conversation model if conversationId provided
  let conversationModel: string | undefined
  if (conversationId && session?.user?.email) {
    try {
      const conv = await getContainer().conversationUseCase.getConversation(
        conversationId,
        session.user.email,
      )
      conversationModel = conv?.model || undefined
    } catch {
      // Non-fatal: fall back to body / default
    }
  }

  const { modelId, provider: resolvedProvider } = resolveModel(
    bodyModel as string | undefined,
    conversationModel,
    env,
  )

  const aiModel = buildProviderModel(resolvedProvider, modelId)

  let ragContext = ''
  let sources: Array<{ source: string; similarity: number }> = []

  // RAG: retrieve relevant document chunks
  if (useRag) {
    const lastUserMsg = [...messages]
      .reverse()
      .find((m: UIMessage) => m.role === 'user')

    if (lastUserMsg) {
      const query = extractTextFromParts(lastUserMsg.parts ?? [])

      if (query) {
        const container = getContainer()
        const embeddingModel = env.AI_PROVIDER === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small'

        const [queryEmbedding] = await container.aiProvider.generateEmbeddings({
          model: embeddingModel,
          texts: [query],
          dimensions: 768,
        })

        const results = await container.vectorStore.search(queryEmbedding, 5, undefined, knowledgeBaseId ?? undefined)

        if (session?.user?.email) {
          void container.auditStore.record({
            userId: session.user.email,
            eventType: 'rag_query',
            metadata: { query: query.slice(0, 500), docsReturned: results.length },
            tokenCount: 0,
          }).catch((err: unknown) => console.error('audit failed', err))
        }

        if (results.length > 0) {
          // Deduplicate sources
          const sourceMap = new Map<string, number>()
          for (const r of results) {
            const src = (r.chunk.metadata?.source as string) ?? 'unknown'
            const existing = sourceMap.get(src)
            if (!existing || r.similarity > existing) {
              sourceMap.set(src, r.similarity)
            }
          }
          sources = Array.from(sourceMap.entries()).map(([source, similarity]) => ({
            source,
            similarity: Math.round(similarity * 100) / 100,
          }))

          ragContext = results.map((r) => {
            const src = (r.chunk.metadata?.source as string) ?? 'unknown'
            return `[Source: ${src}]\n${r.chunk.content}`
          }).join('\n\n---\n\n')
        }
      }
    }
  }

  // Build system prompt
  const parts = [RICH_CONTENT_INSTRUCTIONS]

  if (ragContext) {
    parts.push(`Answer based on the following document context. Always cite which source document you used. If the context doesn't contain relevant information, say so.\n\nDocument context:\n${ragContext}`)
  }

  if (systemPrompt) {
    parts.push(systemPrompt)
  }

  const result = streamText({
    model: aiModel,
    messages: toModelMessages(messages),
    system: parts.join('\n\n'),
    // Without this, provider errors after the 200 response are swallowed and
    // the client just sees an empty assistant message.
    onError({ error }) {
      console.error(`[chat] stream error (${resolvedProvider}:${modelId}):`, error)
    },
    onFinish({ usage }) {
      if (!session?.user?.email) return
      const tokenCount = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)
      void getContainer().auditStore.record({
        userId: session.user.email,
        eventType: 'chat_message',
        metadata: { model: modelId, provider: resolvedProvider },
        tokenCount,
        costUsd: computeCost(modelId, tokenCount),
      }).catch((err: unknown) => console.error('audit failed', err))
    },
  })

  // Stream the response with sources in a custom header
  const response = result.toTextStreamResponse()

  if (sources.length > 0) {
    const headers = new Headers(response.headers)
    headers.set('X-RAG-Sources', JSON.stringify(sources))
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  }

  return response
}
