import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const category = searchParams.get('category') ?? undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

  const { marketplaceUseCase } = getContainer()
  const agents = await marketplaceUseCase.browse({ q, category, limit, offset })

  return NextResponse.json({ agents })
}
