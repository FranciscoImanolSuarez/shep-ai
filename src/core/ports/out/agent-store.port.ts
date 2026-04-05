import type { Agent } from '@/core/domain/entities/agent'

export interface AgentStorePort {
  save(agent: Agent): Promise<Agent>
  findById(id: string): Promise<Agent | null>
  findAll(): Promise<Agent[]>
  update(id: string, data: Partial<Omit<Agent, 'id' | 'createdAt'>>): Promise<Agent>
  delete(id: string): Promise<void>
}
