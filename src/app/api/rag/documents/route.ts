import { NextResponse } from 'next/server'
import { createDb } from '@/adapters/db/connection'
import { documents } from '@/adapters/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  const db = createDb()

  const docs = await db
    .select({
      id: documents.id,
      source: documents.source,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt))

  return NextResponse.json({ documents: docs })
}
