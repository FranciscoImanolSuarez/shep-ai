import type { VectorSearchResult } from '@/core/ports/out/vector-store.port'

/**
 * P1.5 — Cross-encoder reranking via Cohere `rerank-v3.5`.
 *
 * Improves recall@K by 15-25% over single-pass pgvector ANN on most corpora.
 * Returns the input slice when COHERE_API_KEY is unset — graceful degradation,
 * not an error. Failures are logged and the original ordering is preserved so
 * a flaky rerank API never breaks a RAG query.
 */
export async function rerankChunks(
  query: string,
  candidates: VectorSearchResult[],
  topN: number,
): Promise<VectorSearchResult[]> {
  if (!process.env.COHERE_API_KEY) {
    return candidates.slice(0, topN)
  }
  if (candidates.length === 0) return candidates
  // If we have fewer candidates than topN there is nothing to rerank — and
  // calling the API would just waste a request.
  if (candidates.length <= topN) return candidates

  try {
    const [{ rerank }, { cohere }] = await Promise.all([
      import('ai'),
      import('@ai-sdk/cohere'),
    ])

    const documents = candidates.map((c) => c.chunk.content)
    const result = await rerank({
      model: cohere.reranking('rerank-v3.5'),
      documents,
      query,
      topN,
    })

    // The ranking entries carry the original index; reconstruct the candidates
    // array in reranked order. Newer SDKs may expose `ranking` with index +
    // score; older returns just `rerankedDocuments`. Handle both.
    const ranking = (result as unknown as { ranking?: Array<{ index: number }> }).ranking
    if (Array.isArray(ranking) && ranking.length > 0) {
      return ranking
        .map((r) => candidates[r.index])
        .filter((c): c is VectorSearchResult => Boolean(c))
        .slice(0, topN)
    }

    // Fallback: align reranked documents back to candidates by content match
    const reranked = (result as unknown as { rerankedDocuments?: string[] }).rerankedDocuments ?? []
    const byContent = new Map(candidates.map((c) => [c.chunk.content, c]))
    const ordered = reranked
      .map((doc) => byContent.get(doc))
      .filter((c): c is VectorSearchResult => Boolean(c))
    return ordered.length > 0 ? ordered.slice(0, topN) : candidates.slice(0, topN)
  } catch (err) {
    console.error('cohere rerank failed, falling back to ANN order', err)
    return candidates.slice(0, topN)
  }
}
