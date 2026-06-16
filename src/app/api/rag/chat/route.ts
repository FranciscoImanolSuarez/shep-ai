import { streamText } from 'ai'
import { z } from 'zod'
import type { UIMessage } from 'ai'
import { auth } from '@/lib/auth'
import { getEnv } from '@/config/env'
import { getContainer } from '@/config/container'
import { extractTextFromParts } from '@/lib/ui-message'
import { getProviderModel } from '@/adapters/ai/model-factory'

const messagePartSchema = z.union([
  z.object({ type: z.string(), text: z.string().optional() }),
  z.record(z.string(), z.unknown()),
])

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(messagePartSchema).optional(),
}).refine(
  (m) => m.content !== undefined || (Array.isArray(m.parts) && m.parts.length > 0),
  { message: 'Each message must have content or parts' },
)

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json()
  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages } = parsed.data

  const env = getEnv()

  // Get the last user message for RAG retrieval
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'user') as UIMessage | undefined

  const query = lastUserMessage ? extractTextFromParts(lastUserMessage.parts ?? []) : ''

  // Retrieve relevant context via the use case (embed + search + rerank)
  const { ragUseCase } = getContainer()
  const chunks = await ragUseCase.retrieve({ query, topK: 5 })

  const context = chunks
    .map((c) => c.content)
    .join('\n\n---\n\n')

  // Convert messages to model messages
  const modelMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: extractTextFromParts((m as UIMessage).parts ?? []),
  }))

  const aiModel = getProviderModel(env.AI_PROVIDER, '')

  const result = streamText({
    model: aiModel,
    messages: modelMessages,
    onError({ error }) {
      console.error(`[rag/chat] stream error (${env.AI_PROVIDER}):`, error)
    },
    system: context
      ? `Answer the user's questions based on the following document context. If the context doesn't contain relevant information, say so clearly.\n\nDocument context:\n${context}`
      : 'No documents have been uploaded yet. Let the user know they need to upload documents first to use document-based chat.',
  })

  return result.toTextStreamResponse()
}
