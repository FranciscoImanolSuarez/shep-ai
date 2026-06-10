import type { WorkflowDefinition } from './workflow-definition'

export interface Workflow {
  id: string
  workspaceId: string
  name: string
  description: string
  definition: WorkflowDefinition
  version: number
  enabled: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
