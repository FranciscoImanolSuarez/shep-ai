import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.email
  const ctx = await getActiveWorkspaceContext()

  const { agentUseCase, knowledgeBaseUseCase, workflowUseCase } = getContainer()

  const [agents, kbs] = await Promise.all([
    agentUseCase.listAgents(ctx?.workspace.id).catch(() => []),
    knowledgeBaseUseCase.list(userId).catch(() => []),
  ])

  // documentCount is already included in each KnowledgeBase via listByUser's count() join
  const docCount = kbs.reduce((sum, kb) => sum + (kb.documentCount ?? 0), 0)

  // Count workflows if we have workspace context
  let workflowCount = 0
  if (ctx) {
    try {
      const wfs = await workflowUseCase.listWorkflows(ctx.workspace.id)
      workflowCount = wfs.length
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({
    agentCount: agents.length,
    docCount,
    workflowCount,
  })
}
