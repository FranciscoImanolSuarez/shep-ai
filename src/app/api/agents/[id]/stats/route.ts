import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { executionStore } = getContainer()

  const executions = await executionStore.findByAgentId(id, 50)

  const totalRuns = executions.length
  const lastRunAt = executions[0]?.createdAt ?? null

  const completed = executions.filter((e) => e.status === 'completed').length
  const successRate = totalRuns > 0 ? Math.round((completed / totalRuns) * 100) : 0

  return NextResponse.json({ totalRuns, lastRunAt, successRate })
}
