import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError, WorkspaceConflictError } from '@/core/usecases/workspace.usecase'

function handleError(err: unknown) {
  if (err instanceof WorkspaceForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 })
  }
  if (err instanceof WorkspaceNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
  if (err instanceof WorkspaceConflictError) {
    return NextResponse.json({ error: err.message }, { status: 409 })
  }
  throw err
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceUseCase } = getContainer()
  const workspaces = await workspaceUseCase.listWorkspaces(session.user.email)

  return NextResponse.json({ workspaces })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name } = body as { name?: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const { workspaceUseCase } = getContainer()
    const workspace = await workspaceUseCase.createWorkspace(session.user.email, { name: name.trim() })
    return NextResponse.json({ workspace }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
