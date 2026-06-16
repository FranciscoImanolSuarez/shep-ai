import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

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
  const { workflowUseCase, scheduledAgentUseCase } = getContainer()

  // Workflows: scan agent nodes in the active workspace
  let workflows: { id: string; name: string }[] = []
  if (ctx) {
    try {
      const all = await workflowUseCase.listWorkflows(ctx.workspace.id)
      workflows = all
        .filter((wf) =>
          wf.definition.nodes.some(
            (n) => n.type === 'agent' && n.config.agentId === id,
          ),
        )
        .map((wf) => ({ id: wf.id, name: wf.name }))
    } catch {
      // Non-fatal — return empty on error
    }
  }

  // Schedules: filter by agentId
  let schedules: { id: string; cronExpression: string }[] = []
  try {
    const all = await scheduledAgentUseCase.listSchedules(session.user.email)
    schedules = all
      .filter((s) => s.agentId === id)
      .map((s) => ({ id: s.id, cronExpression: s.cronExpression }))
  } catch {
    // Non-fatal — return empty on error
  }

  return NextResponse.json({ workflows, schedules })
}
