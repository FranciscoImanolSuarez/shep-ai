import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET() {
  const { agentUseCase } = getContainer()
  const agents = await agentUseCase.listAgents()
  return NextResponse.json({ agents })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, description, systemPrompt, model, provider, toolIds, config, metadata, knowledgeBaseId } = body

  if (!name || !model) {
    return NextResponse.json(
      { error: 'name and model are required' },
      { status: 400 },
    )
  }

  const { agentUseCase } = getContainer()

  const agent = await agentUseCase.createAgent({
    name,
    description: description ?? '',
    systemPrompt: systemPrompt ?? '',
    model,
    provider: provider ?? 'openai',
    toolIds,
    config,
    metadata,
    knowledgeBaseId: knowledgeBaseId ?? null,
  })

  return NextResponse.json({ agent }, { status: 201 })
}
