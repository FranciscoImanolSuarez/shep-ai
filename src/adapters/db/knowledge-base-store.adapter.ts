import { eq, sql, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { KnowledgeBaseStorePort } from '@/core/ports/out/knowledge-base-store.port'
import type { KnowledgeBase } from '@/core/domain/entities/knowledge-base'
import type { Document } from '@/core/domain/entities/document'
import { knowledgeBases, documents } from './schema'
import type { Database } from './connection'

type KnowledgeBaseRow = typeof knowledgeBases.$inferSelect

function toDomain(row: KnowledgeBaseRow, documentCount?: number): KnowledgeBase {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    documentCount,
  }
}

export class KnowledgeBaseStoreAdapter implements KnowledgeBaseStorePort {
  constructor(private readonly db: Database) {}

  async insert(kb: KnowledgeBase): Promise<KnowledgeBase> {
    const [row] = await this.db.insert(knowledgeBases).values({
      id: kb.id ?? randomUUID(),
      userId: kb.userId,
      name: kb.name,
      description: kb.description,
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt,
    }).returning()

    return toDomain(row)
  }

  async listByUser(userId: string): Promise<KnowledgeBase[]> {
    const rows = await this.db
      .select({
        id: knowledgeBases.id,
        userId: knowledgeBases.userId,
        name: knowledgeBases.name,
        description: knowledgeBases.description,
        createdAt: knowledgeBases.createdAt,
        updatedAt: knowledgeBases.updatedAt,
        documentCount: sql<number>`count(${documents.id})::int`,
      })
      .from(knowledgeBases)
      .leftJoin(documents, eq(documents.knowledgeBaseId, knowledgeBases.id))
      .where(eq(knowledgeBases.userId, userId))
      .groupBy(knowledgeBases.id)
      .orderBy(desc(knowledgeBases.createdAt))

    return rows.map((r) => toDomain(r, r.documentCount))
  }

  async getByIdAndUser(id: string, userId: string): Promise<KnowledgeBase | null> {
    const [row] = await this.db
      .select({
        id: knowledgeBases.id,
        userId: knowledgeBases.userId,
        name: knowledgeBases.name,
        description: knowledgeBases.description,
        createdAt: knowledgeBases.createdAt,
        updatedAt: knowledgeBases.updatedAt,
        documentCount: sql<number>`count(${documents.id})::int`,
      })
      .from(knowledgeBases)
      .leftJoin(documents, eq(documents.knowledgeBaseId, knowledgeBases.id))
      .where(eq(knowledgeBases.id, id))
      .groupBy(knowledgeBases.id)

    if (!row || row.userId !== userId) return null
    return toDomain(row, row.documentCount)
  }

  async update(id: string, data: Partial<Pick<KnowledgeBase, 'name' | 'description' | 'updatedAt'>>): Promise<KnowledgeBase> {
    const values: Record<string, unknown> = {}
    if (data.name !== undefined) values.name = data.name
    if (data.description !== undefined) values.description = data.description
    if (data.updatedAt !== undefined) values.updatedAt = data.updatedAt

    const [row] = await this.db
      .update(knowledgeBases)
      .set(values)
      .where(eq(knowledgeBases.id, id))
      .returning()

    if (!row) throw new Error(`Knowledge base not found: ${id}`)
    return toDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(knowledgeBases).where(eq(knowledgeBases.id, id))
  }

  async listDocumentsByKb(knowledgeBaseId: string): Promise<Document[]> {
    const rows = await this.db
      .select({
        id: documents.id,
        content: documents.content,
        source: documents.source,
        metadata: documents.metadata,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.knowledgeBaseId, knowledgeBaseId))
      .orderBy(desc(documents.createdAt))

    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      source: r.source,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: r.createdAt,
    }))
  }
}
