import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { UIMessage } from 'ai'
import { getEnv } from '@/config/env'
import { getContainer } from '@/config/container'

function getModel(provider: string, model: string) {
  switch (provider) {
    case 'anthropic':
      return anthropic(model || 'claude-sonnet-4-20250514')
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL
          ? `${process.env.OLLAMA_BASE_URL}/v1`
          : 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      return ollama(model || 'llama3.1')
    }
    case 'openai':
    default:
      return openai(model || 'gpt-4o')
  }
}

function getTextFromUIMessage(m: UIMessage): string {
  return m.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('') ?? ''
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages must be a non-empty array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const env = getEnv()

  // Get the last user message for RAG retrieval
  const lastUserMessage = [...messages]
    .reverse()
    .find((m: UIMessage) => m.role === 'user')

  const query = getTextFromUIMessage(lastUserMessage)

  // Retrieve relevant context from documents
  const [queryEmbedding] = await getContainer().aiProvider.generateEmbeddings({
    model: env.AI_PROVIDER === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small',
    texts: [query],
    dimensions: 768,
  })

  const results = await getContainer().vectorStore.search(queryEmbedding, 5)

  const context = results
    .map((r) => r.chunk.content)
    .join('\n\n---\n\n')

  // Convert UIMessages to model messages
  const modelMessages = messages.map((m: UIMessage) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: getTextFromUIMessage(m),
  }))

  const aiModel = getModel(env.AI_PROVIDER, '')

  const result = streamText({
    model: aiModel,
    messages: modelMessages,
    system: context
      ? `Answer the user's questions based on the following document context. If the context doesn't contain relevant information, say so clearly.\n\nDocument context:\n${context}`
      : 'No documents have been uploaded yet. Let the user know they need to upload documents first to use document-based chat.',
  })

  return result.toTextStreamResponse()
}
