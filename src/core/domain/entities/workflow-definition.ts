import type { WorkflowNode } from './workflow-node'

export interface WorkflowEdge {
  id: string
  source: string // node id
  target: string // node id
  sourceHandle?: 'true' | 'false' | null // for condition node branches
  targetHandle?: string
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
