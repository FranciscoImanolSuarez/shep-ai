import type { Workflow } from '@/core/domain/entities/workflow'
import type { WorkflowRun } from '@/core/domain/entities/workflow-run'
import type { WorkflowRunNode } from '@/core/domain/entities/workflow-run-node'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

export interface CreateWorkflowInput {
  workspaceId: string
  name: string
  description?: string
  definition: WorkflowDefinition
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  definition?: WorkflowDefinition
  enabled?: boolean
}

export interface RunWorkflowInput {
  workspaceId: string
  workflowId: string
  input: Record<string, unknown>
  userId?: string
}

export interface WorkflowPort {
  createWorkflow(input: CreateWorkflowInput): Promise<Workflow>
  updateWorkflow(workspaceId: string, id: string, input: UpdateWorkflowInput): Promise<Workflow>
  deleteWorkflow(workspaceId: string, id: string): Promise<void>
  listWorkflows(workspaceId: string): Promise<Workflow[]>
  getWorkflow(workspaceId: string, id: string): Promise<Workflow | null>
  runWorkflow(input: RunWorkflowInput): Promise<WorkflowRun>
  getRun(workspaceId: string, runId: string): Promise<{ run: WorkflowRun; nodes: WorkflowRunNode[] } | null>
  listRuns(workspaceId: string, workflowId: string, limit?: number): Promise<WorkflowRun[]>
}
