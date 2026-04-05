import type { Message } from '@/core/domain/entities/message'

export interface GenerateOptions {
  model: string
  messages: Message[]
  systemPrompt?: string
  tools?: unknown[]
  maxTokens?: number
  temperature?: number
}

export interface EmbeddingOptions {
  model: string
  texts: string[]
  dimensions?: number
}

export interface AIProviderPort {
  generateStream(options: GenerateOptions): Promise<ReadableStream>
  generateText(options: GenerateOptions): Promise<string>
  generateEmbeddings(options: EmbeddingOptions): Promise<number[][]>
}
