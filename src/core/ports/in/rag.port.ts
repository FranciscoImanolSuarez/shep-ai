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

export interface RagPort {
  ingest(input: IngestInput): Promise<Document>
  query(input: QueryInput): Promise<RagQueryResult>
  deleteDocument(documentId: string): Promise<void>
}
