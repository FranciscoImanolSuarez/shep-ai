import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ traceId: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { traceId } = await params

  const { observabilityUseCase } = getContainer()
  const result = await observabilityUseCase.getTrace(ctx.workspace.id, traceId)

  if (!result) {
    // 404 (NOT 403) — workspace isolation hides existence per spec scenario REQ-OBS-8
    return NextResponse.json({ error: 'Trace not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
