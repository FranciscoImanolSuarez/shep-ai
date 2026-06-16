import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const querySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  knowledgeBaseId: z.string().optional(),
  includeMetadata: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = querySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { query, topK, filter, knowledgeBaseId, includeMetadata } = parsed.data

  const { ragUseCase } = getContainer()

  const result = await ragUseCase.query({
    query,
    topK,
    filter,
    knowledgeBaseId,
    includeMetadata,
  })

  return NextResponse.json(result)
}
