import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const documentItemSchema = z.object({
  content: z.string().min(1),
  source: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const ingestSchema = z.object({
  knowledgeBaseId: z.string().min(1),
  documents: z.array(documentItemSchema).optional(),
  // single document fields (used when documents array is absent)
  content: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().min(0).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = ingestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const data = parsed.data
  const { knowledgeBaseId, chunkSize, chunkOverlap } = data

  const { ragUseCase, knowledgeBaseUseCase } = getContainer()

  // Verify ownership
  const kb = await knowledgeBaseUseCase.get(session.user.email, knowledgeBaseId)
  if (!kb) {
    return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
  }

  // Support both single and batch ingest
  if (Array.isArray(data.documents)) {
    const results = await Promise.all(
      data.documents.map((item) =>
        ragUseCase.ingest({
          content: item.content,
          source: item.source,
          knowledgeBaseId,
          metadata: item.metadata,
          chunkSize,
          chunkOverlap,
        }),
      ),
    )

    return NextResponse.json({ documents: results })
  }

  // Single document
  if (!data.content || !data.source) {
    return NextResponse.json(
      { error: 'content and source are required' },
      { status: 400 },
    )
  }

  const document = await ragUseCase.ingest({
    content: data.content,
    source: data.source,
    knowledgeBaseId,
    metadata: data.metadata,
    chunkSize,
    chunkOverlap,
  })

  return NextResponse.json({ document })
}
