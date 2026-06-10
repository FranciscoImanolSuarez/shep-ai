import { randomUUID } from 'crypto'
import { Cron } from 'croner'
import type { ScheduledAgent, ScheduledAgentRun } from '@/core/domain/entities/scheduled-agent'
import type { ScheduledAgentPort, CreateScheduleInput, UpdateScheduleInput, RunScheduleResult } from '@/core/ports/in/scheduled-agent.port'
import type { ScheduledAgentStorePort } from '@/core/ports/out/scheduled-agent-store.port'
import type { AgentPort } from '@/core/ports/in/agent.port'

const BATCH_SIZE = 5

function computeNextRun(cronExpression: string, from: Date = new Date()): Date {
  const job = new Cron(cronExpression)
  const next = job.nextRun(from)
  if (!next) throw new Error(`Cron expression '${cronExpression}' has no future occurrence`)
  return next
}

export function validateCronExpression(expr: string): boolean {
  try {
    new Cron(expr)
    return true
  } catch {
    return false
  }
}

async function runBatched<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>): Promise<{ ran: number; errors: number }> {
  let ran = 0
  let errors = 0

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const results = await Promise.allSettled(batch.map(fn))
    for (const r of results) {
      if (r.status === 'fulfilled') ran++
      else errors++
    }
  }

  return { ran, errors }
}

export class ScheduledAgentUseCase implements ScheduledAgentPort {
  constructor(
    private readonly store: ScheduledAgentStorePort,
    private readonly agentUseCase: AgentPort,
  ) {}

  async createSchedule(input: CreateScheduleInput): Promise<ScheduledAgent> {
    const nextRunAt = computeNextRun(input.cronExpression)
    const now = new Date()

    return this.store.insert({
      userId: input.userId,
      agentId: input.agentId,
      cronExpression: input.cronExpression,
      input: input.input ?? {},
      enabled: input.enabled ?? true,
      notifyOnSuccess: input.notifyOnSuccess ?? false,
      notifyOnFailure: input.notifyOnFailure ?? true,
      nextRunAt,
      createdAt: now,
      updatedAt: now,
    })
  }

  async listSchedules(userId: string): Promise<ScheduledAgent[]> {
    return this.store.listByUser(userId)
  }

  async getSchedule(id: string): Promise<ScheduledAgent | null> {
    return this.store.getById(id)
  }

  async updateSchedule(id: string, data: UpdateScheduleInput): Promise<ScheduledAgent> {
    const update: Partial<Omit<ScheduledAgent, 'id' | 'userId' | 'createdAt'>> = {
      updatedAt: new Date(),
    }

    if (data.cronExpression !== undefined) {
      update.cronExpression = data.cronExpression
      update.nextRunAt = computeNextRun(data.cronExpression)
    }
    if (data.input !== undefined) update.input = data.input
    if (data.enabled !== undefined) update.enabled = data.enabled
    if (data.notifyOnSuccess !== undefined) update.notifyOnSuccess = data.notifyOnSuccess
    if (data.notifyOnFailure !== undefined) update.notifyOnFailure = data.notifyOnFailure

    return this.store.update(id, update)
  }

  async deleteSchedule(id: string): Promise<void> {
    return this.store.delete(id)
  }

  async runScheduleManually(id: string): Promise<RunScheduleResult> {
    const schedule = await this.store.getById(id)
    if (!schedule) throw new Error(`Schedule not found: ${id}`)

    return this.executeSchedule(schedule, 'manual')
  }

  async listRunsBySchedule(scheduledAgentId: string, limit = 20): Promise<ScheduledAgentRun[]> {
    return this.store.listRunsBySchedule(scheduledAgentId, limit)
  }

  async runDueSchedules(): Promise<{ ran: number; errors: number }> {
    const now = new Date()
    const due = await this.store.listDue(now)

    const { ran, errors } = await runBatched(due, BATCH_SIZE, async (schedule) => {
      await this.executeSchedule(schedule, 'cron')
    })

    return { ran, errors }
  }

  private async executeSchedule(
    schedule: ScheduledAgent,
    triggeredBy: 'cron' | 'manual',
  ): Promise<RunScheduleResult> {
    const startedAt = Date.now()
    const run = await this.store.recordRun({
      scheduledAgentId: schedule.id,
      status: 'running',
      totalTokens: 0,
      triggeredBy,
      createdAt: new Date(),
    })

    try {
      const { text, totalTokens } = await this.agentUseCase.runAgentToCompletion({
        agentId: schedule.agentId,
        messages: [{
          id: randomUUID(),
          role: 'user',
          content: JSON.stringify(schedule.input),
          createdAt: new Date(),
        }],
      })

      const durationMs = Date.now() - startedAt
      const completedAt = new Date()
      const nextRunAt = computeNextRun(schedule.cronExpression, completedAt)

      const [updatedRun] = await Promise.all([
        this.store.updateRun(run.id, {
          status: 'completed',
          result: text,
          totalTokens,
          durationMs,
          completedAt,
        }),
        this.store.update(schedule.id, {
          lastRunAt: completedAt,
          nextRunAt,
          updatedAt: completedAt,
        }),
      ])

      return { run: updatedRun, text }
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const completedAt = new Date()
      const errorMessage = error instanceof Error ? error.message : String(error)

      const [updatedRun] = await Promise.all([
        this.store.updateRun(run.id, {
          status: 'failed',
          errorMessage,
          durationMs,
          completedAt,
        }),
        this.store.update(schedule.id, {
          lastRunAt: completedAt,
          nextRunAt: computeNextRun(schedule.cronExpression, completedAt),
          updatedAt: completedAt,
        }),
      ])

      throw Object.assign(new Error(errorMessage), { run: updatedRun })
    }
  }
}
