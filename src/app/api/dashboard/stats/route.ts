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

  const { agentUseCase, knowledgeBaseUseCase, knowledgeBaseStore, workflowUseCase } = getContainer()

  const [agents, kbs] = await Promise.all([
    agentUseCase.listAgents().catch(() => []),
    knowledgeBaseUseCase.list(userId).catch(() => []),
  ])

  // Count total documents across all knowledge bases
  let docCount = 0
  try {
    const docCounts = await Promise.all(
      kbs.map((kb) =>
        knowledgeBaseStore
          .listDocumentsByKb(kb.id)
          .then((docs) => docs.length)
          .catch(() => 0),
      ),
    )
    docCount = docCounts.reduce((a, b) => a + b, 0)
  } catch {
    // non-fatal
  }

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
