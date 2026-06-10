import type { Conversation, ConversationMessage } from '@/core/domain/entities/conversation'

export interface ConversationStorePort {
  createConversation(data: {
    userId: string
    title?: string
    model?: string
    useRag?: boolean
  }): Promise<Conversation>

  getConversation(id: string, userId: string): Promise<Conversation | null>

  listConversations(userId: string): Promise<Conversation[]>

  countConversations(userId: string): Promise<number>

  updateConversation(
    id: string,
    userId: string,
    data: Partial<Pick<Conversation, 'title' | 'model' | 'useRag'>>,
  ): Promise<Conversation>

  deleteConversation(id: string, userId: string): Promise<void>

  addMessage(
    conversationId: string,
    data: {
      role: 'user' | 'assistant' | 'system'
      content: string
      parts?: unknown[]
    },
  ): Promise<ConversationMessage>

  listMessages(conversationId: string): Promise<ConversationMessage[]>
}
