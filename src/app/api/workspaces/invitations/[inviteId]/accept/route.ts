import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceNotFoundError, WorkspaceConflictError, InvitationExpiredError } from '@/core/usecases/workspace.usecase'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { inviteId } = await params

  try {
    const { workspaceUseCase } = getContainer()
    const member = await workspaceUseCase.acceptInvitation(session.user.email, inviteId)
    return NextResponse.json({ member }, { status: 201 })
  } catch (err) {
    if (err instanceof InvitationExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 410 })
    }
    if (err instanceof WorkspaceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof WorkspaceConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    throw err
  }
}
