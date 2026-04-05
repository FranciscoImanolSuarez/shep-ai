import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function POST(req: Request) {
  const body = await req.json()
  const { query, topK, filter, includeMetadata } = body as {
    query: string
    topK?: number
    filter?: Record<string, unknown>
    includeMetadata?: boolean
  }

  if (!query) {
    return NextResponse.json(
      { error: 'query is required' },
      { status: 400 },
    )
  }

  const { ragUseCase } = getContainer()

  const result = await ragUseCase.query({
    query,
    topK,
    filter,
    includeMetadata,
  })

  return NextResponse.json(result)
}
