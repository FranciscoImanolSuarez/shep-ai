import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from '@/core/usecases/workspace.usecase'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { workspaceId } = body as { workspaceId?: string }

  if (!workspaceId?.trim()) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  try {
    const { workspaceUseCase } = getContainer()
    await workspaceUseCase.setActiveWorkspace(session.user.email, workspaceId.trim())
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof WorkspaceForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    if (err instanceof WorkspaceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    throw err
  }
}
