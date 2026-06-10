import type { WorkflowDefinition } from './workflow-definition'

export type WorkflowRunStatus = 'running' | 'completed' | 'failed'

export interface WorkflowRun {
  id: string
  workflowId: string
  workspaceId: string
  triggeredBy: 'manual' | 'api'
  triggeredByUserId?: string
  status: WorkflowRunStatus
  definitionSnapshot: WorkflowDefinition
  input: Record<string, unknown>
  output?: Record<string, unknown>
  errorMessage?: string
  errorNodeId?: string
  traceId?: string
  totalTokens: number
  totalCostUsd: string
  durationMs?: number
  startedAt: Date
  completedAt?: Date
}
