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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wsId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wsId } = await params

  try {
    const { workspaceUseCase } = getContainer()
    const members = await workspaceUseCase.listMembers(session.user.email, wsId)
    return NextResponse.json({ members })
  } catch (err) {
    return handleError(err)
  }
}
