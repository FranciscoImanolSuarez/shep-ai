import { streamText, type UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { getEnv } from '@/config/env'

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

function toModelMessages(messages: UIMessage[]) {
  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? (m as unknown as { content?: string }).content ?? '',
  }))
}

export async function POST(req: Request) {
  const { messages, model, provider, systemPrompt } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages must be a non-empty array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const env = getEnv()

  const aiModel = getModel(provider ?? env.AI_PROVIDER, model ?? '')

  const result = streamText({
    model: aiModel,
    messages: toModelMessages(messages),
    system: systemPrompt,
  })

  return result.toTextStreamResponse()
}
