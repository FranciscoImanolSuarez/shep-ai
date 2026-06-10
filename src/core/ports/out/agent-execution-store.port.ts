import type { AgentExecution } from '@/core/domain/entities/agent-execution'

export interface AgentExecutionStorePort {
  save(execution: AgentExecution): Promise<AgentExecution>
  findById(id: string): Promise<AgentExecution | null>
  findByAgentId(agentId: string, limit?: number): Promise<AgentExecution[]>
  findByParentId(parentId: string): Promise<AgentExecution[]>
  update(id: string, data: Partial<Omit<AgentExecution, 'id' | 'agentId' | 'createdAt'>>): Promise<AgentExecution>
}
