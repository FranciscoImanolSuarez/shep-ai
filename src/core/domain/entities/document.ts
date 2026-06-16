export interface Document {
  id: string
  /** Full text — omitted on list queries; available via getDocumentContent(id). */
  content?: string
  embedding?: number[]
  metadata: Record<string, unknown>
  source: string
  createdAt: Date
}

export interface DocumentChunk {
  id: string
  documentId: string
  content: string
  embedding: number[]
  metadata: Record<string, unknown>
  chunkIndex: number
}
