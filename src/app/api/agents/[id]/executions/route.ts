import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit')) || 20

  const { agentUseCase } = getContainer()

  const agent = await agentUseCase.getAgent(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const executions = await agentUseCase.getExecutions(id, limit)
  return NextResponse.json({ executions })
}
