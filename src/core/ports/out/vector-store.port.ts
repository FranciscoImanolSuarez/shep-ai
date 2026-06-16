import type { Document, DocumentChunk } from '@/core/domain/entities/document'

export interface VectorSearchResult {
  chunk: DocumentChunk
  similarity: number
}

export interface StoredDocument {
  id: string
  source: string
  metadata: Record<string, unknown>
  knowledgeBaseId: string | null
  createdAt: Date
}

export interface VectorStorePort {
  saveDocument(doc: Document & { content: string; knowledgeBaseId?: string }): Promise<void>
  upsertChunks(chunks: DocumentChunk[]): Promise<void>
  search(embedding: number[], topK: number, filter?: Record<string, unknown>, knowledgeBaseId?: string): Promise<VectorSearchResult[]>
  deleteByDocumentId(documentId: string): Promise<void>
  /** Returns all documents (metadata only, no content). */
  listDocuments(): Promise<StoredDocument[]>
  /** Returns a single document by id (metadata only, no content). Null if not found. */
  getDocumentById(id: string): Promise<StoredDocument | null>
}
