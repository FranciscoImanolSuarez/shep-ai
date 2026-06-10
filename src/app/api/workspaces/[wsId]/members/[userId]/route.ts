import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError, WorkspaceConflictError } from '@/core/usecases/workspace.usecase'
import type { Role } from '@/core/domain/entities/workspace'

const VALID_ROLES: Role[] = ['admin', 'member', 'viewer']

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ wsId: string; userId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wsId, userId } = await params
  const body = await req.json()
  const { role } = body as { role?: string }

  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  try {
    const { workspaceUseCase } = getContainer()
    const member = await workspaceUseCase.changeRole(session.user.email, wsId, userId, role as Role)
    return NextResponse.json({ member })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ wsId: string; userId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wsId, userId } = await params

  try {
    const { workspaceUseCase } = getContainer()
    await workspaceUseCase.removeMember(session.user.email, wsId, userId)
    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}
