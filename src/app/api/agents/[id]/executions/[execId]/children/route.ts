import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; execId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { execId } = await params
  const { agentUseCase } = getContainer()

  const executions = await agentUseCase.getChildExecutions(execId)
  return NextResponse.json({ executions })
}
