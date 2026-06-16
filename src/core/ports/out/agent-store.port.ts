import type { Agent } from '@/core/domain/entities/agent'

export interface AgentStorePort {
  save(agent: Agent): Promise<Agent>
  findById(id: string): Promise<Agent | null>
  /** T3.3: Workspace-scoped lookup — returns null if the agent exists in a DIFFERENT workspace. */
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Agent | null>
  findAll(): Promise<Agent[]>
  /** Returns agents where workspaceId matches OR workspaceId IS NULL (legacy agents stay visible). */
  findByWorkspace(workspaceId: string): Promise<Agent[]>
  update(id: string, data: Partial<Omit<Agent, 'id' | 'createdAt'>>): Promise<Agent>
  delete(id: string): Promise<void>
}
