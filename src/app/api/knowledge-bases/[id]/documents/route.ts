import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { knowledgeBaseUseCase } = getContainer()

  try {
    const docs = await knowledgeBaseUseCase.listDocuments(session.user.email, id)
    return NextResponse.json({ documents: docs })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
