import { eq, desc, and, count } from 'drizzle-orm'
import type { ConversationStorePort } from '@/core/ports/out/conversation-store.port'
import type { Conversation, ConversationMessage } from '@/core/domain/entities/conversation'
import { conversations, messages } from './schema'
import type { Database } from './connection'

export class ConversationStoreAdapter implements ConversationStorePort {
  constructor(private readonly db: Database) {}

  async createConversation(data: {
    userId: string
    title?: string
    model?: string
    useRag?: boolean
  }): Promise<Conversation> {
    const [row] = await this.db
      .insert(conversations)
      .values({
        userId: data.userId,
        title: data.title ?? '',
        model: data.model ?? 'gpt-4o-mini',
        useRag: data.useRag ?? false,
      })
      .returning()

    return this.mapConversation(row)
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .limit(1)

    return row ? this.mapConversation(row) : null
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))

    return rows.map(this.mapConversation)
  }

  async countConversations(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(conversations)
      .where(eq(conversations.userId, userId))

    return row?.value ?? 0
  }

  async updateConversation(
    id: string,
    userId: string,
    data: Partial<Pick<Conversation, 'title' | 'model' | 'useRag'>>,
  ): Promise<Conversation> {
    const [row] = await this.db
      .update(conversations)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.useRag !== undefined && { useRag: data.useRag }),
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning()

    return this.mapConversation(row)
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    await this.db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
  }

  async addMessage(
    conversationId: string,
    data: {
      role: 'user' | 'assistant' | 'system'
      content: string
      parts?: unknown[]
    },
  ): Promise<ConversationMessage> {
    const [row] = await this.db
      .insert(messages)
      .values({
        conversationId,
        role: data.role,
        content: data.content,
        parts: data.parts ?? [],
      })
      .returning()

    // Bump conversation updatedAt
    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))

    return this.mapMessage(row)
  }

  async listMessages(conversationId: string): Promise<ConversationMessage[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)

    return rows.map(this.mapMessage)
  }

  private mapConversation(row: typeof conversations.$inferSelect): Conversation {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      model: row.model,
      useRag: row.useRag,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private mapMessage(row: typeof messages.$inferSelect): ConversationMessage {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      parts: (row.parts as unknown[]) ?? [],
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
    }
  }
}
