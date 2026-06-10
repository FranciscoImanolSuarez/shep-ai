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
    const workspace = await workspaceUseCase.getWorkspace(session.user.email, wsId)
    return NextResponse.json({ workspace })
  } catch (err) {
    return handleError(err)
  }
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
  const { name, plan } = body as { name?: string; plan?: string }

  try {
    const { workspaceUseCase } = getContainer()
    const workspace = await workspaceUseCase.updateWorkspace(session.user.email, wsId, {
      ...(name !== undefined && { name: name.trim() }),
      ...(plan !== undefined && { plan }),
    })
    return NextResponse.json({ workspace })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
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
    await workspaceUseCase.deleteWorkspace(session.user.email, wsId)
    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}
