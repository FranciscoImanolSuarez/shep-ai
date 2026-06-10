import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pubId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pubId } = await params
  const body = await req.json()
  const { rating } = body

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 })
  }

  const { marketplaceUseCase } = getContainer()

  try {
    const result = await marketplaceUseCase.rate({ userEmail: session.user.email, pubId, rating })
    return NextResponse.json({ rating: result }, { status: 201 })
  } catch (error) {
    const err = error as Error & { code?: string }
    if (err.code === 'ALREADY_RATED') return NextResponse.json({ error: 'Already rated' }, { status: 409 })
    if (err.message.includes('not found')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (err.message.includes('between 1 and 5')) return NextResponse.json({ error: err.message }, { status: 400 })
    throw error
  }
}
