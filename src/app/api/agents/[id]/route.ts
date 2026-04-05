import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { agentUseCase } = getContainer()
  const agent = await agentUseCase.getAgent(id)

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({ agent })
}

const ALLOWED_UPDATE_FIELDS = ['name', 'description', 'systemPrompt', 'model', 'provider', 'toolIds', 'config', 'metadata'] as const

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: `No valid fields provided. Allowed: ${ALLOWED_UPDATE_FIELDS.join(', ')}` }, { status: 400 })
  }

  const { agentUseCase } = getContainer()

  try {
    const agent = await agentUseCase.updateAgent(id, update)
    return NextResponse.json({ agent })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    throw error
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { agentUseCase } = getContainer()
  await agentUseCase.deleteAgent(id)
  return new Response(null, { status: 204 })
}
