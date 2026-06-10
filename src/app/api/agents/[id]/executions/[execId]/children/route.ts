import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; execId: string }> },
) {
  const { execId } = await params
  const { executionStore } = getContainer()

  const executions = await executionStore.findByParentId(execId)
  return NextResponse.json({ executions })
}
