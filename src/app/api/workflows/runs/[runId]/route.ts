import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId } = await params
  const { workflowUseCase } = getContainer()

  const result = await workflowUseCase.getRun(ctx.workspace.id, runId)

  if (!result) {
    // 404 (NOT 403) — workspace isolation: cross-workspace run returns 404
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // nodes includes spanId and nodeType for drill-in.
  // agentExecutionId is already on each node (from workflowRunNodes.agentExecutionId).
  return NextResponse.json(result)
}
