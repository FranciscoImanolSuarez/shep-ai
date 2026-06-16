import type { Document, DocumentChunk } from '@/core/domain/entities/document'

export interface IngestInput {
  content: string
  source: string
  knowledgeBaseId: string
  metadata?: Record<string, unknown>
  chunkSize?: number
  chunkOverlap?: number
}

export interface QueryInput {
  query: string
  topK?: number
  filter?: Record<string, unknown>
  includeMetadata?: boolean
  knowledgeBaseId?: string
}

export interface RagQueryResult {
  answer: string
  sources: DocumentChunk[]
}

export interface ListedDocument {
  id: string
  source: string
  metadata: Record<string, unknown>
  knowledgeBaseId: string | null
  createdAt: Date
}

export interface RetrievedChunk {
  content: string
  metadata: Record<string, unknown>
}

export interface RagPort {
  ingest(input: IngestInput): Promise<Document>
  query(input: QueryInput): Promise<RagQueryResult>
  deleteDocument(documentId: string): Promise<void>
  /** Returns all documents (metadata only, ordered newest first). */
  listDocuments(): Promise<ListedDocument[]>
  /** Returns a single document's metadata + knowledgeBaseId. Null if not found. */
  getDocument(id: string): Promise<ListedDocument | null>
  /**
   * Retrieval-only path: embed + vector search + rerank. Returns ranked chunks
   * without generating a text answer. Use this when the caller handles generation
   * (e.g. streaming routes that call streamText themselves).
   */
  retrieve(input: QueryInput): Promise<RetrievedChunk[]>
}
