import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { scheduledAgentUseCase } = getContainer()

  const schedule = await scheduledAgentUseCase.getSchedule(id)
  if (!schedule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (schedule.userId !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await scheduledAgentUseCase.runScheduleManually(id)
    return NextResponse.json({ run: result.run, text: result.text })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Execution failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
