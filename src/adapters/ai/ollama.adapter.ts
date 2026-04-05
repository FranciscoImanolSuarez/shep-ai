import { createOpenAI } from '@ai-sdk/openai'
import { streamText, generateText, embedMany } from 'ai'
import type { AIProviderPort, GenerateOptions, EmbeddingOptions } from '@/core/ports/out/ai-provider.port'
import type { Message } from '@/core/domain/entities/message'

function createOllamaProvider() {
  return createOpenAI({
    baseURL: process.env.OLLAMA_BASE_URL
      ? `${process.env.OLLAMA_BASE_URL}/v1`
      : 'http://localhost:11434/v1',
    apiKey: 'ollama',
  })
}

function toSDKMessages(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))
}

export class OllamaAdapter implements AIProviderPort {
  private readonly provider = createOllamaProvider()

  async generateStream(options: GenerateOptions): Promise<ReadableStream> {
    const model = this.provider(options.model)

    const result = streamText({
      model,
      messages: toSDKMessages(options.messages),
      system: options.systemPrompt,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
    })

    return result.toTextStreamResponse().body!
  }

  async generateText(options: GenerateOptions): Promise<string> {
    const model = this.provider(options.model)

    const result = await generateText({
      model,
      messages: toSDKMessages(options.messages),
      system: options.systemPrompt,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
    })

    return result.text
  }

  async generateEmbeddings(options: EmbeddingOptions): Promise<number[][]> {
    const model = this.provider.embedding(options.model)

    const { embeddings } = await embedMany({
      model,
      values: options.texts,
    })

    return embeddings
  }
}
