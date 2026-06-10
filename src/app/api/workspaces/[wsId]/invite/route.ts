import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from '@/core/usecases/workspace.usecase'
import type { Role } from '@/core/domain/entities/workspace'

const VALID_ROLES: Role[] = ['admin', 'member', 'viewer']

function handleError(err: unknown) {
  if (err instanceof WorkspaceForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 })
  }
  if (err instanceof WorkspaceNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
  throw err
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ wsId: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wsId } = await params
  const body = await req.json()
  const { email, role = 'member' } = body as { email?: string; role?: string }

  if (!email?.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  try {
    const { workspaceUseCase } = getContainer()
    const invitation = await workspaceUseCase.inviteMember(session.user.email, wsId, {
      email: email.trim(),
      role: role as Role,
    })
    return NextResponse.json({ invitation }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
