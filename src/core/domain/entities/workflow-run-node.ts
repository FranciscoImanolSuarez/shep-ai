import type { WorkflowNodeType } from './workflow-node'

export type WorkflowRunNodeStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed'

export interface WorkflowRunNode {
  id: string
  workflowRunId: string
  nodeId: string
  nodeType: WorkflowNodeType
  status: WorkflowRunNodeStatus
  input?: unknown
  output?: unknown
  errorMessage?: string
  spanId?: string
  agentExecutionId?: string
  startedAt?: Date
  completedAt?: Date
}
