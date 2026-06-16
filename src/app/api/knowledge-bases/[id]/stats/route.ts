import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { knowledgeBaseUseCase, knowledgeBaseStore } = getContainer()

  try {
    const [docs, totalChars] = await Promise.all([
      knowledgeBaseUseCase.listDocuments(session.user.email, id),
      knowledgeBaseStore.getTotalContentChars(id),
    ])

    const docCount = docs.length
    // Estimate tokens: average ~4 chars per token
    const estimatedTokens = Math.round(totalChars / 4)

    // Most recent ingestion
    const sortedDates = docs
      .map((d) => d.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    const lastIngestedAt = sortedDates[0] ?? null

    return NextResponse.json({ docCount, estimatedTokens, lastIngestedAt })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
