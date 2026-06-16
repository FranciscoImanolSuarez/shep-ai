import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
}).refine(
  (d) => d.name !== undefined || d.description !== undefined,
  { message: 'At least one of name or description must be provided' },
)

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { knowledgeBaseUseCase } = getContainer()
  const kb = await knowledgeBaseUseCase.get(session.user.email, id)

  if (!kb) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(kb)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateKnowledgeBaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { name, description } = parsed.data

  const { knowledgeBaseUseCase } = getContainer()

  try {
    const kb = await knowledgeBaseUseCase.update(session.user.email, id, { name, description })
    return NextResponse.json(kb)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { knowledgeBaseUseCase } = getContainer()

  try {
    await knowledgeBaseUseCase.delete(session.user.email, id)
    return new Response(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
