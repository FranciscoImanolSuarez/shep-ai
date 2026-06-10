export type WorkflowNodeType = 'input' | 'output' | 'agent' | 'condition'

interface BaseNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
}

export interface InputNode extends BaseNode {
  type: 'input'
  config: { schema?: Record<string, unknown> }
}

export interface OutputNode extends BaseNode {
  type: 'output'
  config: { template?: string }
}

export interface AgentNode extends BaseNode {
  type: 'agent'
  config: {
    agentId: string
    inputTemplate?: string
    /** Per-node tuning merged over the agent's stored config at run time. */
    overrides?: {
      temperature?: number
      maxSteps?: number
      tokenBudget?: number
    }
  }
}

export interface ConditionNode extends BaseNode {
  type: 'condition'
  config: { expression: string } // JSONLogic JSON string
}

export type WorkflowNode = InputNode | OutputNode | AgentNode | ConditionNode
