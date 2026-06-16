import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET(req: Request) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const windowParam = url.searchParams.get('window') ?? '24h'

  const windowMs =
    windowParam === '7d' ? 7 * 24 * 60 * 60 * 1000 :
    windowParam === '30d' ? 30 * 24 * 60 * 60 * 1000 :
    24 * 60 * 60 * 1000 // default 24h

  const to = new Date()
  const from = new Date(to.getTime() - windowMs)

  const { observabilityUseCase } = getContainer()

  const allTraces = await observabilityUseCase.listTraces({
    workspaceId: ctx.workspace.id,
    startedAfter: from,
    startedBefore: to,
    limit: 200,
  })

  const totalTraces = allTraces.length
  const errorCount = allTraces.filter((t) => t.status === 'error').length

  const completedTraces = allTraces.filter((t) => t.durationMs !== undefined)
  const avgDurationMs =
    completedTraces.length > 0
      ? Math.round(
          completedTraces.reduce((sum, t) => sum + (t.durationMs ?? 0), 0) / completedTraces.length,
        )
      : 0

  const totalCostUsd = allTraces.reduce((sum, t) => sum + parseFloat(t.totalCostUsd ?? '0'), 0)

  return NextResponse.json({
    window: windowParam,
    totalTraces,
    errorCount,
    avgDurationMs,
    totalCostUsd,
  })
}
