import { eq, sql, desc } from 'drizzle-orm'
import type { VectorStorePort, VectorSearchResult } from '@/core/ports/out/vector-store.port'
import type { Document, DocumentChunk } from '@/core/domain/entities/document'
import { documents, documentChunks } from './schema'
import type { Database } from './connection'

export class PgVectorAdapter implements VectorStorePort {
  constructor(private readonly db: Database) {}

  async saveDocument(doc: Document): Promise<void> {
    await this.db.insert(documents).values({
      id: doc.id,
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

  async search(embedding: number[], topK: number, _filter?: Record<string, unknown>): Promise<VectorSearchResult[]> {
    const similarity = sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(embedding)}::vector)`

    const results = await this.db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        embedding: documentChunks.embedding,
        metadata: documentChunks.metadata,
        chunkIndex: documentChunks.chunkIndex,
        similarity,
      })
      .from(documentChunks)
      .orderBy(desc(similarity))
      .limit(topK)

    return results.map((row) => ({
      chunk: {
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        embedding: row.embedding ?? [],
        metadata: (row.metadata as Record<string, unknown>) ?? {},
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
