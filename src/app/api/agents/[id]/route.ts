import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import type { Agent } from '@/core/domain/entities/agent'

const updateSchema = z.object({
  name: z.string().min(1, 'name must be a non-empty string').optional(),
  model: z.string().min(1, 'model must be a non-empty string').optional(),
  provider: z.enum(['openai', 'anthropic', 'ollama']).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  knowledgeBaseId: z.string().nullable().optional(),
  config: z.object({
    maxSteps: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    toolChoice: z.enum(['auto', 'required', 'none']).optional(),
    maxDelegationDepth: z.number().int().nonnegative().optional(),
    tokenBudget: z.number().int().positive().optional(),
    memoryEnabled: z.boolean().optional(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Checks workspace isolation: if ctx is present and the agent has a non-null
 * workspaceId that differs from the active workspace, return 404 (don't leak
 * cross-workspace agent existence). Null-workspace (legacy) agents are always
 * accessible to any authenticated user.
 */
function isWorkspaceMismatch(agent: Agent, ctxWorkspaceId?: string): boolean {
  if (!ctxWorkspaceId) return false
  if (agent.workspaceId == null) return false
  return agent.workspaceId !== ctxWorkspaceId
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const ctx = await getActiveWorkspaceContext()
  const { agentUseCase } = getContainer()
  const agent = await agentUseCase.getAgent(id)

  if (!agent || isWorkspaceMismatch(agent, ctx?.workspace.id)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({ agent })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 },
    )
  }

  if (Object.keys(result.data).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields provided' },
      { status: 400 },
    )
  }

  const ctx = await getActiveWorkspaceContext()
  const { agentUseCase } = getContainer()

  // Check agent exists and workspace isolation before update
  const existing = await agentUseCase.getAgent(id)
  if (!existing || isWorkspaceMismatch(existing, ctx?.workspace.id)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  try {
    const agent = await agentUseCase.updateAgent(id, result.data)
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
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const ctx = await getActiveWorkspaceContext()
  const { agentUseCase } = getContainer()

  const existing = await agentUseCase.getAgent(id)
  if (!existing || isWorkspaceMismatch(existing, ctx?.workspace.id)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  await agentUseCase.deleteAgent(id)
  return new Response(null, { status: 204 })
}
