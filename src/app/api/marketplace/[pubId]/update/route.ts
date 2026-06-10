import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pubId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pubId } = await params
  const { marketplaceUseCase } = getContainer()

  try {
    const agent = await marketplaceUseCase.pushUpdate({ userEmail: session.user.email, pubId })
    return NextResponse.json({ agent })
  } catch (error) {
    const err = error as Error & { code?: string }
    if (err.code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (err.message.includes('not found')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    throw error
  }
}
