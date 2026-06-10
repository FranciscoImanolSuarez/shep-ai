import type { Conversation, ConversationMessage } from '@/core/domain/entities/conversation'
import type { ConversationStorePort } from '@/core/ports/out/conversation-store.port'

export class ConversationUseCase {
  constructor(private readonly store: ConversationStorePort) {}

  async createConversation(data: {
    userId: string
    title?: string
    model?: string
    useRag?: boolean
  }): Promise<Conversation> {
    return this.store.createConversation(data)
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    return this.store.getConversation(id, userId)
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return this.store.listConversations(userId)
  }

  async countConversations(userId: string): Promise<number> {
    return this.store.countConversations(userId)
  }

  async updateConversation(
    id: string,
    userId: string,
    data: Partial<Pick<Conversation, 'title' | 'model' | 'useRag'>>,
  ): Promise<Conversation> {
    return this.store.updateConversation(id, userId, data)
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    return this.store.deleteConversation(id, userId)
  }

  async addMessage(
    conversationId: string,
    data: {
      role: 'user' | 'assistant' | 'system'
      content: string
      parts?: unknown[]
    },
  ): Promise<ConversationMessage> {
    return this.store.addMessage(conversationId, data)
  }

  async listMessages(conversationId: string): Promise<ConversationMessage[]> {
    return this.store.listMessages(conversationId)
  }

  /**
   * Auto-generate a conversation title from the first user message.
   * Returns the first 60 characters, trimmed.
   */
  generateTitle(firstUserMessage: string): string {
    return firstUserMessage.slice(0, 60).trim()
  }
}
