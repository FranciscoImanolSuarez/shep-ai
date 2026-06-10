import type { ScheduledAgent, ScheduledAgentRun } from '@/core/domain/entities/scheduled-agent'

export interface CreateScheduleInput {
  userId: string
  agentId: string
  cronExpression: string
  input?: Record<string, unknown>
  enabled?: boolean
  notifyOnSuccess?: boolean
  notifyOnFailure?: boolean
}

export interface UpdateScheduleInput {
  cronExpression?: string
  input?: Record<string, unknown>
  enabled?: boolean
  notifyOnSuccess?: boolean
  notifyOnFailure?: boolean
}

export interface RunScheduleResult {
  run: ScheduledAgentRun
  text: string
}

export interface ScheduledAgentPort {
  createSchedule(input: CreateScheduleInput): Promise<ScheduledAgent>
  listSchedules(userId: string): Promise<ScheduledAgent[]>
  getSchedule(id: string): Promise<ScheduledAgent | null>
  updateSchedule(id: string, data: UpdateScheduleInput): Promise<ScheduledAgent>
  deleteSchedule(id: string): Promise<void>
  runScheduleManually(id: string): Promise<RunScheduleResult>
  runDueSchedules(): Promise<{ ran: number; errors: number }>
  listRunsBySchedule(scheduledAgentId: string, limit?: number): Promise<ScheduledAgentRun[]>
}
