import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

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
  const { name, description } = body as { name?: string; description?: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { knowledgeBaseUseCase } = getContainer()
  const kb = await knowledgeBaseUseCase.create(session.user.email, { name: name.trim(), description })

  return NextResponse.json(kb, { status: 201 })
}
