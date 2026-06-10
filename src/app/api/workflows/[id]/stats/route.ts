import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { workflowUseCase } = getContainer()

  const runs = await workflowUseCase.listRuns(ctx.workspace.id, id)

  const totalRuns = runs.length
  const lastRunAt = runs[0]?.startedAt ?? null

  const completed = runs.filter((r) => r.status === 'completed').length
  const successRate = totalRuns > 0 ? Math.round((completed / totalRuns) * 100) : 0

  return NextResponse.json({ totalRuns, lastRunAt, successRate })
}
