import { NextResponse } from 'next/server'
import { getEnv } from '@/config/env'
import { getContainer } from '@/config/container'

export async function POST(req: Request) {
  const { query } = await req.json()

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ sources: [] })
  }

  const env = getEnv()
  const container = getContainer()
  const embeddingModel = env.AI_PROVIDER === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small'

  try {
    const [queryEmbedding] = await container.aiProvider.generateEmbeddings({
      model: embeddingModel,
      texts: [query],
      dimensions: 768,
    })

    const results = await container.vectorStore.search(queryEmbedding, 5)

    // Deduplicate by source
    const sourceMap = new Map<string, number>()
    for (const r of results) {
      const src = (r.chunk.metadata?.source as string) ?? 'unknown'
      const existing = sourceMap.get(src)
      if (!existing || r.similarity > existing) {
        sourceMap.set(src, r.similarity)
      }
    }

    const sources = Array.from(sourceMap.entries())
      .map(([source, similarity]) => ({
        source,
        similarity: Math.round(similarity * 100) / 100,
      }))
      .sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({ sources })
  } catch {
    return NextResponse.json({ sources: [] })
  }
}
