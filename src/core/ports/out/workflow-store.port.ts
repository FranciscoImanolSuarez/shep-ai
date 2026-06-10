import type { Workflow } from '@/core/domain/entities/workflow'
import type { WorkflowRun } from '@/core/domain/entities/workflow-run'
import type { WorkflowRunNode } from '@/core/domain/entities/workflow-run-node'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

export interface WorkflowStorePort {
  // Workflow CRUD
  saveWorkflow(w: Workflow): Promise<Workflow>
  updateWorkflow(workspaceId: string, id: string, patch: Partial<Omit<Workflow, 'id' | 'workspaceId' | 'createdAt'>>): Promise<Workflow>
  deleteWorkflow(workspaceId: string, id: string): Promise<void>
  listWorkflows(workspaceId: string): Promise<Workflow[]>
  getWorkflow(workspaceId: string, id: string): Promise<Workflow | null>

  // Run CRUD
  insertRun(run: WorkflowRun): Promise<WorkflowRun>
  updateRun(id: string, patch: Partial<WorkflowRun>): Promise<WorkflowRun>
  getRun(workspaceId: string, id: string): Promise<WorkflowRun | null>
  listRuns(workspaceId: string, workflowId: string, limit?: number): Promise<WorkflowRun[]>

  // RunNode CRUD
  insertRunNode(node: WorkflowRunNode): Promise<void>
  updateRunNode(id: string, patch: Partial<WorkflowRunNode>): Promise<void>
  getRunNodes(workflowRunId: string): Promise<WorkflowRunNode[]>
}

// Re-export for convenience in callers
export type { WorkflowDefinition }
