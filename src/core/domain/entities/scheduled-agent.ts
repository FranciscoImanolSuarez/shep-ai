export type ScheduledAgentRunStatus = 'running' | 'completed' | 'failed'
export type ScheduledAgentTriggeredBy = 'cron' | 'manual'

export interface ScheduledAgent {
  id: string
  userId: string
  agentId: string
  cronExpression: string
  input: Record<string, unknown>
  enabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  lastRunAt?: Date
  nextRunAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface ScheduledAgentRun {
  id: string
  scheduledAgentId: string
  agentExecutionId?: string
  status: ScheduledAgentRunStatus
  result?: string
  errorMessage?: string
  totalTokens: number
  durationMs?: number
  triggeredBy: ScheduledAgentTriggeredBy
  createdAt: Date
  completedAt?: Date
}

export function createScheduledAgent(
  data: Omit<ScheduledAgent, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<ScheduledAgent, 'id'> {
  const now = new Date()
  return {
    ...data,
    createdAt: now,
    updatedAt: now,
  }
}

export function createScheduledAgentRun(
  data: Pick<ScheduledAgentRun, 'scheduledAgentId' | 'triggeredBy'>,
): Omit<ScheduledAgentRun, 'id'> {
  return {
    scheduledAgentId: data.scheduledAgentId,
    triggeredBy: data.triggeredBy,
    status: 'running',
    totalTokens: 0,
    createdAt: new Date(),
  }
}
