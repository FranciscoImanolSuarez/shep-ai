import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import { NotFoundError, ValidationError } from '@/core/usecases/workflow.usecase'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { input?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // input is optional — empty body is valid
  }

  const input = (body.input != null && typeof body.input === 'object' && !Array.isArray(body.input))
    ? (body.input as Record<string, unknown>)
    : {}

  const { workflowUseCase } = getContainer()

  try {
    const run = await workflowUseCase.runWorkflow({
      workspaceId: ctx.workspace.id,
      workflowId: id,
      input,
      userId: ctx.userId,
    })

    // Return immediately with runId and final status
    // (execution is synchronous per ADR-8 — the run is complete by the time we return)
    return NextResponse.json({ runId: run.id, status: run.status }, { status: 201 })
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    throw err
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { workflowUseCase } = getContainer()

  const runs = await workflowUseCase.listRuns(ctx.workspace.id, id)
  return NextResponse.json(runs)
}
