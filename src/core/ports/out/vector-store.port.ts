import type { Document, DocumentChunk } from '@/core/domain/entities/document'

export interface VectorSearchResult {
  chunk: DocumentChunk
  similarity: number
}

export interface VectorStorePort {
  saveDocument(doc: Document): Promise<void>
  upsertChunks(chunks: DocumentChunk[]): Promise<void>
  search(embedding: number[], topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>
  deleteByDocumentId(documentId: string): Promise<void>
}
