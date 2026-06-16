import type { VectorSearchResult } from './vector-store.port'

/**
 * Port for cross-encoder reranking of RAG candidates.
 * Cohere adapter implements this when COHERE_API_KEY is set.
 * PassthroughReranker is the no-op fallback.
 */
export interface RerankerPort {
  rerank(
    query: string,
    candidates: VectorSearchResult[],
    topK: number,
  ): Promise<VectorSearchResult[]>
}

/**
 * No-op reranker — returns candidates sliced to topK unchanged.
 * Used when no COHERE_API_KEY is configured.
 */
export class PassthroughReranker implements RerankerPort {
  async rerank(
    _query: string,
    candidates: VectorSearchResult[],
    topK: number,
  ): Promise<VectorSearchResult[]> {
    return candidates.slice(0, topK)
  }
}
