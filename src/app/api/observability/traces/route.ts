import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import type { TraceStatus } from '@/core/domain/entities/trace'

export async function GET(req: Request) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const params = url.searchParams

  const status = params.get('status') as TraceStatus | null
  const startedAfter = params.get('startedAfter')
  const startedBefore = params.get('startedBefore')
  const agentId = params.get('agentId') ?? undefined
  const workflowId = params.get('workflowId') ?? undefined
  const limitStr = params.get('limit')
  const cursor = params.get('cursor') ?? undefined

  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 200) : 50

  const { observabilityUseCase } = getContainer()

  const traces = await observabilityUseCase.listTraces({
    workspaceId: ctx.workspace.id,
    status: status ?? undefined,
    startedAfter: startedAfter ? new Date(startedAfter) : undefined,
    startedBefore: startedBefore ? new Date(startedBefore) : undefined,
    agentId,
    workflowId,
    limit,
    cursor,
  })

  return NextResponse.json(traces)
}
