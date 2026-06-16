import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
})

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
  const parsed = rateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { rating } = parsed.data

  const { marketplaceUseCase } = getContainer()

  try {
    const result = await marketplaceUseCase.rate({ userEmail: session.user.email, pubId, rating })
    return NextResponse.json({ rating: result }, { status: 201 })
  } catch (error) {
    const err = error as Error & { code?: string }
    if (err.code === 'ALREADY_RATED') return NextResponse.json({ error: 'Already rated' }, { status: 409 })
    if (err.message.includes('not found')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    throw error
  }
}
