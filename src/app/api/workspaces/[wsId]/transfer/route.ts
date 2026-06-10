import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from '@/core/usecases/workspace.usecase'

function handleError(err: unknown) {
  if (err instanceof WorkspaceForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 })
  }
  if (err instanceof WorkspaceNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
  throw err
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ wsId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wsId } = await params
  const body = await req.json()
  const { newOwnerId } = body as { newOwnerId?: string }

  if (!newOwnerId?.trim()) {
    return NextResponse.json({ error: 'newOwnerId is required' }, { status: 400 })
  }

  try {
    const { workspaceUseCase } = getContainer()
    await workspaceUseCase.transferOwnership(session.user.email, wsId, newOwnerId.trim())
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}
