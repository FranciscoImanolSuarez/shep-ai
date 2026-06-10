import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { agentId, category = 'general', tags = [], description } = body

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  const { marketplaceUseCase } = getContainer()

  try {
    const published = await marketplaceUseCase.publish({
      userEmail: session.user.email,
      agentId,
      category,
      tags: Array.isArray(tags) ? tags : [],
      description,
    })

    return NextResponse.json({ agent: published }, { status: 201 })
  } catch (error) {
    const err = error as Error
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
