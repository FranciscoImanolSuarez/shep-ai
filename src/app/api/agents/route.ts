import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

const agentConfigSchema = z.object({
  maxSteps: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  toolChoice: z.enum(['auto', 'required', 'none']).optional(),
  maxDelegationDepth: z.number().int().nonnegative().optional(),
  tokenBudget: z.number().int().positive().optional(),
  memoryEnabled: z.boolean().optional(),
}).optional()

const createSchema = z.object({
  name: z.string().min(1, 'name is required'),
  model: z.string().min(1, 'model is required'),
  provider: z.enum(['openai', 'anthropic', 'ollama']).default('openai'),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  knowledgeBaseId: z.string().nullable().optional(),
  config: agentConfigSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getActiveWorkspaceContext()
  const { agentUseCase } = getContainer()
  const agents = await agentUseCase.listAgents(ctx?.workspace.id)
  return NextResponse.json({ agents })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 },
    )
  }

  const ctx = await getActiveWorkspaceContext()
  const { agentUseCase } = getContainer()

  const agent = await agentUseCase.createAgent({
    name: result.data.name,
    description: result.data.description ?? '',
    systemPrompt: result.data.systemPrompt ?? '',
    model: result.data.model,
    provider: result.data.provider,
    toolIds: result.data.toolIds,
    config: result.data.config,
    metadata: result.data.metadata,
    knowledgeBaseId: result.data.knowledgeBaseId ?? null,
    workspaceId: ctx?.workspace.id ?? null,
  })

  return NextResponse.json({ agent }, { status: 201 })
}
