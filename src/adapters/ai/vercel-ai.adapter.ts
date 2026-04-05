import { streamText, generateText, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { AIProviderPort, GenerateOptions, EmbeddingOptions } from '@/core/ports/out/ai-provider.port'
import type { Message } from '@/core/domain/entities/message'

type ProviderType = 'openai' | 'anthropic'

function getModel(modelId: string, provider: ProviderType = 'openai') {
  switch (provider) {
    case 'anthropic':
      return anthropic(modelId)
    case 'openai':
    default:
      return openai(modelId)
  }
}

function toSDKMessages(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))
}

export class VercelAIAdapter implements AIProviderPort {
  constructor(private readonly defaultProvider: ProviderType = 'openai') {}

  async generateStream(options: GenerateOptions): Promise<ReadableStream> {
    const provider = this.detectProvider(options.model)
    const model = getModel(options.model, provider)

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
    const provider = this.detectProvider(options.model)
    const model = getModel(options.model, provider)

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
    const model = openai.embedding(options.model)

    const { embeddings } = await embedMany({
      model,
      values: options.texts,
      providerOptions: options.dimensions
        ? { openai: { dimensions: options.dimensions } }
        : undefined,
    })

    return embeddings
  }

  private detectProvider(model: string): ProviderType {
    if (model.startsWith('claude')) return 'anthropic'
    return this.defaultProvider
  }
}
