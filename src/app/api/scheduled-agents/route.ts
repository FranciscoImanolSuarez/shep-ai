import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { validateCronExpression } from '@/core/usecases/scheduled-agent.usecase'

const createSchema = z.object({
  agentId: z.string().uuid(),
  cronExpression: z.string(),
  input: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  notifyOnSuccess: z.boolean().optional(),
  notifyOnFailure: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { scheduledAgentUseCase } = getContainer()
  const schedules = await scheduledAgentUseCase.listSchedules(session.user.email)
  return NextResponse.json({ schedules })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { cronExpression } = parsed.data
  if (!validateCronExpression(cronExpression)) {
    return NextResponse.json(
      { error: `Invalid cron expression: '${cronExpression}'` },
      { status: 422 },
    )
  }

  const { scheduledAgentUseCase } = getContainer()

  const schedule = await scheduledAgentUseCase.createSchedule({
    userId: session.user.email,
    ...parsed.data,
  })

  return NextResponse.json({ schedule }, { status: 201 })
}
