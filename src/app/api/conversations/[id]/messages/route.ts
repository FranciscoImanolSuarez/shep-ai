import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(z.unknown()).optional(),
}).refine(
  (m) => m.content !== undefined || (Array.isArray(m.parts) && m.parts.length > 0),
  { message: 'content or parts is required' },
)

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
  const parsed = addMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { role, content, parts } = parsed.data
  // Derive a string content: prefer explicit content, fall back to empty string
  // (parts-only messages are stored with an empty content string)
  const resolvedContent = content ?? ''

  const { conversationUseCase } = getContainer()

  // Verify ownership
  const conversation = await conversationUseCase.getConversation(id, session.user.email)
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const message = await conversationUseCase.addMessage(id, { role, content: resolvedContent, parts })
  return NextResponse.json({ message }, { status: 201 })
}
