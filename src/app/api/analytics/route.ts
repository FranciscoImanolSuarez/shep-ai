import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { granularity } = parsed.data
  const now = new Date()
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const to = parsed.data.to ? new Date(parsed.data.to) : now

  const { auditStore } = getContainer()
  const result = await auditStore.aggregate(session.user.email, { from, to }, granularity)

  return NextResponse.json(result)
}
