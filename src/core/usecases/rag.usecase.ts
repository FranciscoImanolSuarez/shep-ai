import { randomUUID } from 'crypto'
import type { Document, DocumentChunk } from '@/core/domain/entities/document'
import type { IngestInput, QueryInput, RagPort, RagQueryResult } from '@/core/ports/in/rag.port'
import type { AIProviderPort } from '@/core/ports/out/ai-provider.port'
import type { VectorStorePort } from '@/core/ports/out/vector-store.port'
import type { RerankerPort } from '@/core/ports/out/reranker.port'

export interface RagConfig {
  embeddingModel: string
  embeddingDimensions?: number
  chatModel: string
}

export class RagUseCase implements RagPort {
  constructor(
    private readonly aiProvider: AIProviderPort,
    private readonly vectorStore: VectorStorePort,
    private readonly config: RagConfig,
    private readonly reranker: RerankerPort,
  ) {}

  async ingest(input: IngestInput): Promise<Document> {
    const documentId = randomUUID()
    const chunks = this.chunkText(input.content, input.chunkSize ?? 512, input.chunkOverlap ?? 50)

    const embeddings = await this.aiProvider.generateEmbeddings({
      model: this.config.embeddingModel,
      texts: chunks,
      dimensions: this.config.embeddingDimensions,
    })

    const documentChunks: DocumentChunk[] = chunks.map((content, index) => ({
      id: randomUUID(),
      documentId,
      content,
      embedding: embeddings[index],
      metadata: input.metadata ?? {},
      chunkIndex: index,
    }))

    const document: Document & { content: string; knowledgeBaseId?: string } = {
      id: documentId,
      content: input.content,
      metadata: input.metadata ?? {},
      source: input.source,
      knowledgeBaseId: input.knowledgeBaseId,
      createdAt: new Date(),
    }

    await this.vectorStore.saveDocument(document)
    await this.vectorStore.upsertChunks(documentChunks)

    return document
  }

  async query(input: QueryInput): Promise<RagQueryResult> {
    const [queryEmbedding] = await this.aiProvider.generateEmbeddings({
      model: this.config.embeddingModel,
      texts: [input.query],
      dimensions: this.config.embeddingDimensions,
    })

    const topK = input.topK ?? 5
    // P1.5: overfetch by 3x so the reranker has candidates to choose from. Cap
    // at 30 so we don't blow up the pgvector query or rerank token cost.
    const overfetchK = Math.min(topK * 3, 30)

    const candidates = await this.vectorStore.search(
      queryEmbedding,
      overfetchK,
      input.filter,
      input.knowledgeBaseId,
    )

    // P1.5: cross-encoder rerank when a real reranker is injected; pass-through otherwise.
    const results = await this.reranker.rerank(input.query, candidates, topK)

    const context = results
      .map((r) => r.chunk.content)
      .join('\n\n---\n\n')

    const answer = await this.aiProvider.generateText({
      model: this.config.chatModel,
      messages: [{ id: 'query', role: 'user', content: input.query, createdAt: new Date() }],
      systemPrompt: `Answer the question based on the following context. If the context doesn't contain relevant information, say so.\n\nContext:\n${context}`,
    })

    return {
      answer,
      sources: results.map((r) => r.chunk),
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.vectorStore.deleteByDocumentId(documentId)
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length)
      chunks.push(text.slice(start, end))
      start += chunkSize - overlap
    }

    return chunks
  }
}
