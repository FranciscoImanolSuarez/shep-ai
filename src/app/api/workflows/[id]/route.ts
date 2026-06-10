import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import { ValidationError, ForbiddenError, NotFoundError } from '@/core/usecases/workflow.usecase'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

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
  const workflow = await workflowUseCase.getWorkflow(ctx.workspace.id, id)

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json(workflow)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { name?: unknown; description?: unknown; definition?: unknown; enabled?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { workflowUseCase } = getContainer()

  try {
    const workflow = await workflowUseCase.updateWorkflow(ctx.workspace.id, id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      definition: body.definition != null ? (body.definition as WorkflowDefinition) : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    })
    return NextResponse.json(workflow)
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    throw err
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { workflowUseCase } = getContainer()

  try {
    await workflowUseCase.deleteWorkflow(ctx.workspace.id, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    throw err
  }
}
