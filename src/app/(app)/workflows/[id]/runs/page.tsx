import { redirect } from 'next/navigation'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import { WorkflowRunsClient } from './_client'

export default async function WorkflowRunsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const ctx = await getActiveWorkspaceContext()
  if (!ctx) redirect('/login')

  const { workflowUseCase } = getContainer()

  const [workflow, runs] = await Promise.all([
    workflowUseCase.getWorkflow(ctx.workspace.id, id),
    workflowUseCase.listRuns(ctx.workspace.id, id),
  ])

  return (
    <WorkflowRunsClient
      workflowId={id}
      workflowName={workflow?.name ?? null}
      initialRuns={runs}
    />
  )
}
