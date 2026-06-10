import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import type { EventType } from '@/core/domain/entities/audit-event'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.string().optional(),
})

const VALID_TYPES: EventType[] = ['chat_message', 'agent_run', 'rag_query', 'document_upload', 'agent_delegation']

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

  const { limit, offset, type } = parsed.data
  const eventType = type && VALID_TYPES.includes(type as EventType) ? (type as EventType) : undefined

  const { auditStore } = getContainer()
  const events = await auditStore.query(session.user.email, { limit, offset, eventType })

  return NextResponse.json({ events, limit, offset })
}
