import type { Message } from '@/core/domain/entities/message'

export interface ChatInput {
  messages: Message[]
  model?: string
  provider?: 'openai' | 'anthropic' | 'ollama'
  systemPrompt?: string
}

export interface ChatPort {
  chat(input: ChatInput): Promise<ReadableStream>
  generateText(input: ChatInput): Promise<string>
}
