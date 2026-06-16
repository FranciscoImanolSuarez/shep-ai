import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from '@/core/usecases/workspace.usecase'

const transferSchema = z.object({
  newOwnerId: z.string().min(1),
})

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
  const parsed = transferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { newOwnerId } = parsed.data

  try {
    const { workspaceUseCase } = getContainer()
    await workspaceUseCase.transferOwnership(session.user.email, wsId, newOwnerId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}
