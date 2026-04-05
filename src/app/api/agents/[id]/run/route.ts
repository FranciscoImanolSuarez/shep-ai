import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'
import type { Message } from '@/core/domain/entities/message'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const { messages, context } = body as {
    messages: Message[]
    context?: Record<string, unknown>
  }

  if (!messages?.length) {
    return NextResponse.json(
      { error: 'messages are required' },
      { status: 400 },
    )
  }

  const { agentUseCase } = getContainer()

  const agent = await agentUseCase.getAgent(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const stream = await agentUseCase.runAgent({
    agentId: id,
    messages,
    context,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
