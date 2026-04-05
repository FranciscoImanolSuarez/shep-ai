export interface Document {
  id: string
  content: string
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
