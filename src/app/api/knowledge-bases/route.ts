import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(500).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { knowledgeBaseUseCase } = getContainer()
  const knowledgeBases = await knowledgeBaseUseCase.list(session.user.email)

  return NextResponse.json({ knowledgeBases })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createKnowledgeBaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { name, description } = parsed.data

  const { knowledgeBaseUseCase } = getContainer()
  const kb = await knowledgeBaseUseCase.create(session.user.email, { name, description })

  return NextResponse.json(kb, { status: 201 })
}
