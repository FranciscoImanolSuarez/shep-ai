import { eq, sql, desc } from 'drizzle-orm'
import type { VectorStorePort, VectorSearchResult } from '@/core/ports/out/vector-store.port'
import type { Document, DocumentChunk } from '@/core/domain/entities/document'
import { documents, documentChunks } from './schema'
import type { Database } from './connection'

export class PgVectorAdapter implements VectorStorePort {
  constructor(private readonly db: Database) {}

  async saveDocument(doc: Document & { knowledgeBaseId?: string }): Promise<void> {
    await this.db.insert(documents).values({
      id: doc.id,
      knowledgeBaseId: doc.knowledgeBaseId ?? null,
      content: doc.content,
      source: doc.source,
      metadata: doc.metadata,
    })
  }

  async upsertChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return

    await this.db.insert(documentChunks).values(
      chunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
        chunkIndex: chunk.chunkIndex,
      })),
    )
  }

  async search(embedding: number[], topK: number, _filter?: Record<string, unknown>, knowledgeBaseId?: string): Promise<VectorSearchResult[]> {
    const similarity = sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(embedding)}::vector)`

    const baseQuery = this.db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        embedding: documentChunks.embedding,
        metadata: documentChunks.metadata,
        chunkIndex: documentChunks.chunkIndex,
        similarity,
        source: documents.source,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))

    const results = await (knowledgeBaseId
      ? baseQuery.where(eq(documents.knowledgeBaseId, knowledgeBaseId)).orderBy(desc(similarity)).limit(topK)
      : baseQuery.orderBy(desc(similarity)).limit(topK))

    return results.map((row) => ({
      chunk: {
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        embedding: row.embedding ?? [],
        metadata: { ...((row.metadata as Record<string, unknown>) ?? {}), source: row.source },
        chunkIndex: row.chunkIndex,
      },
      similarity: row.similarity,
    }))
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.db.delete(documentChunks).where(eq(documentChunks.documentId, documentId))
    await this.db.delete(documents).where(eq(documents.id, documentId))
  }
}
