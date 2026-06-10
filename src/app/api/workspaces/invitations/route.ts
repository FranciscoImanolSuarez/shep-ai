import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceUseCase } = getContainer()
  const invitations = await workspaceUseCase.listInvitationsByEmail(session.user.email)

  return NextResponse.json({ invitations })
}
