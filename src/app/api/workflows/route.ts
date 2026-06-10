import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import { ValidationError } from '@/core/usecases/workflow.usecase'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

export async function GET() {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workflowUseCase } = getContainer()
  const workflows = await workflowUseCase.listWorkflows(ctx.workspace.id)
  return NextResponse.json(workflows)
}

export async function POST(req: Request) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: unknown; description?: unknown; definition?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.definition) {
    return NextResponse.json({ error: 'definition is required' }, { status: 400 })
  }

  const { workflowUseCase } = getContainer()

  try {
    const workflow = await workflowUseCase.createWorkflow({
      workspaceId: ctx.workspace.id,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : undefined,
      definition: body.definition as WorkflowDefinition,
    })
    return NextResponse.json(workflow, { status: 201 })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    throw err
  }
}
