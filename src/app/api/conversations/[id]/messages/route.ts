import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { conversationUseCase } = getContainer()

  // Verify ownership
  const conversation = await conversationUseCase.getConversation(id, session.user.email)
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const messages = await conversationUseCase.listMessages(id)
  return NextResponse.json({ messages })
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { role, content, parts } = body as {
    role: 'user' | 'assistant' | 'system'
    content: string
    parts?: unknown[]
  }

  if (!role || !content) {
    return NextResponse.json(
      { error: 'role and content are required' },
      { status: 400 },
    )
  }

  const { conversationUseCase } = getContainer()

  // Verify ownership
  const conversation = await conversationUseCase.getConversation(id, session.user.email)
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const message = await conversationUseCase.addMessage(id, { role, content, parts })
  return NextResponse.json({ message }, { status: 201 })
}
