import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

interface IngestItem {
  content: string
  source: string
  metadata?: Record<string, unknown>
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { ragUseCase, knowledgeBaseUseCase } = getContainer()
  const knowledgeBaseId = body.knowledgeBaseId as string | undefined

  if (!knowledgeBaseId) {
    return NextResponse.json(
      { error: 'knowledgeBaseId is required' },
      { status: 400 },
    )
  }

  // Verify ownership
  const kb = await knowledgeBaseUseCase.get(session.user.email, knowledgeBaseId)
  if (!kb) {
    return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
  }

  // Support both single and batch ingest
  if (Array.isArray(body.documents)) {
    const items = body.documents as IngestItem[]

    if (items.some((d) => !d.content || !d.source)) {
      return NextResponse.json(
        { error: 'each document requires content and source' },
        { status: 400 },
      )
    }

    const results = await Promise.all(
      items.map((item) =>
        ragUseCase.ingest({
          content: item.content,
          source: item.source,
          knowledgeBaseId,
          metadata: item.metadata,
          chunkSize: body.chunkSize,
          chunkOverlap: body.chunkOverlap,
        }),
      ),
    )

    return NextResponse.json({ documents: results })
  }

  // Single document
  const { content, source, metadata, chunkSize, chunkOverlap } = body as IngestItem & {
    chunkSize?: number
    chunkOverlap?: number
  }

  if (!content || !source) {
    return NextResponse.json(
      { error: 'content and source are required' },
      { status: 400 },
    )
  }

  const document = await ragUseCase.ingest({
    content,
    source,
    knowledgeBaseId,
    metadata,
    chunkSize,
    chunkOverlap,
  })

  return NextResponse.json({ document })
}
