export interface Conversation {
  id: string
  userId: string
  title: string
  model: string
  useRag: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ConversationMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts: unknown[]
  metadata: Record<string, unknown>
  createdAt: Date
}
