import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from '@/core/usecases/workspace.usecase'

const activeWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = activeWorkspaceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { workspaceId } = parsed.data

  try {
    const { workspaceUseCase } = getContainer()
    await workspaceUseCase.setActiveWorkspace(session.user.email, workspaceId)
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
