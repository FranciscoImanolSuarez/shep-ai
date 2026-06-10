import type { ScheduledAgent, ScheduledAgentRun } from '@/core/domain/entities/scheduled-agent'

export interface ScheduledAgentStorePort {
  insert(agent: Omit<ScheduledAgent, 'id'>): Promise<ScheduledAgent>
  listByUser(userId: string): Promise<ScheduledAgent[]>
  getById(id: string): Promise<ScheduledAgent | null>
  update(id: string, data: Partial<Omit<ScheduledAgent, 'id' | 'userId' | 'createdAt'>>): Promise<ScheduledAgent>
  delete(id: string): Promise<void>
  listDue(now: Date): Promise<ScheduledAgent[]>
  recordRun(run: Omit<ScheduledAgentRun, 'id'>): Promise<ScheduledAgentRun>
  updateRun(id: string, data: Partial<Omit<ScheduledAgentRun, 'id' | 'scheduledAgentId' | 'createdAt'>>): Promise<ScheduledAgentRun>
  listRunsBySchedule(scheduledAgentId: string, limit?: number): Promise<ScheduledAgentRun[]>
}
