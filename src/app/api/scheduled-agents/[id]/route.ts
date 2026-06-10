import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { validateCronExpression } from '@/core/usecases/scheduled-agent.usecase'

const patchSchema = z.object({
  cronExpression: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  notifyOnSuccess: z.boolean().optional(),
  notifyOnFailure: z.boolean().optional(),
})

async function resolveOwned(id: string, userId: string) {
  const { scheduledAgentUseCase } = getContainer()
  const schedule = await scheduledAgentUseCase.getSchedule(id)
  if (!schedule) return { error: 'Not found', status: 404 as const }
  if (schedule.userId !== userId) return { error: 'Forbidden', status: 403 as const }
  return { schedule }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await resolveOwned(id, session.user.email)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const { scheduledAgentUseCase } = getContainer()
  const runs = await scheduledAgentUseCase.listRunsBySchedule(id)

  return NextResponse.json({ schedule: result.schedule, runs })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await resolveOwned(id, session.user.email)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.cronExpression && !validateCronExpression(parsed.data.cronExpression)) {
    return NextResponse.json(
      { error: `Invalid cron expression: '${parsed.data.cronExpression}'` },
      { status: 422 },
    )
  }

  const { scheduledAgentUseCase } = getContainer()
  const schedule = await scheduledAgentUseCase.updateSchedule(id, parsed.data)
  return NextResponse.json({ schedule })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await resolveOwned(id, session.user.email)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const { scheduledAgentUseCase } = getContainer()
  await scheduledAgentUseCase.deleteSchedule(id)
  return new Response(null, { status: 204 })
}
