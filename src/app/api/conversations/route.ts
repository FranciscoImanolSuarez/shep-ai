import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationUseCase } = getContainer()
  const conversations = await conversationUseCase.listConversations(session.user.email)
  const total = await conversationUseCase.countConversations(session.user.email)

  return NextResponse.json({ conversations, total })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { model, useRag } = body as { model?: string; useRag?: boolean }

  const { conversationUseCase } = getContainer()
  const conversation = await conversationUseCase.createConversation({
    userId: session.user.email,
    model,
    useRag,
  })

  return NextResponse.json({ conversation }, { status: 201 })
}
