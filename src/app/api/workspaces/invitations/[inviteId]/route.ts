import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceNotFoundError } from '@/core/usecases/workspace.usecase'

export async function DELETE(
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
    await workspaceUseCase.declineInvitation(session.user.email, inviteId)
    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof WorkspaceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    throw err
  }
}
