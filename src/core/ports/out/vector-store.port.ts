import type { Document, DocumentChunk } from '@/core/domain/entities/document'

export interface VectorSearchResult {
  chunk: DocumentChunk
  similarity: number
}

export interface VectorStorePort {
  saveDocument(doc: Document & { knowledgeBaseId?: string }): Promise<void>
  upsertChunks(chunks: DocumentChunk[]): Promise<void>
  search(embedding: number[], topK: number, filter?: Record<string, unknown>, knowledgeBaseId?: string): Promise<VectorSearchResult[]>
  deleteByDocumentId(documentId: string): Promise<void>
}
