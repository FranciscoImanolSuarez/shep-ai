import type { ChatInput, ChatPort } from '@/core/ports/in/chat.port'
import type { AIProviderPort } from '@/core/ports/out/ai-provider.port'

export class ChatUseCase implements ChatPort {
  constructor(private readonly aiProvider: AIProviderPort) {}

  async chat(input: ChatInput): Promise<ReadableStream> {
    return this.aiProvider.generateStream({
      model: input.model ?? 'gpt-4o',
      messages: input.messages,
      systemPrompt: input.systemPrompt,
    })
  }

  async generateText(input: ChatInput): Promise<string> {
    return this.aiProvider.generateText({
      model: input.model ?? 'gpt-4o',
      messages: input.messages,
      systemPrompt: input.systemPrompt,
    })
  }
}
