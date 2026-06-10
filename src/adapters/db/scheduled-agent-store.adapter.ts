import { eq, lte, and, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { ScheduledAgentStorePort } from '@/core/ports/out/scheduled-agent-store.port'
import type { ScheduledAgent, ScheduledAgentRun, ScheduledAgentRunStatus, ScheduledAgentTriggeredBy } from '@/core/domain/entities/scheduled-agent'
import { scheduledAgents, scheduledAgentRuns } from './schema'
import type { Database } from './connection'

type ScheduledAgentRow = typeof scheduledAgents.$inferSelect
type ScheduledAgentRunRow = typeof scheduledAgentRuns.$inferSelect

function toAgentDomain(row: ScheduledAgentRow): ScheduledAgent {
  return {
    id: row.id,
    userId: row.userId,
    agentId: row.agentId,
    cronExpression: row.cronExpression,
    input: (row.input ?? {}) as Record<string, unknown>,
    enabled: row.enabled,
    notifyOnSuccess: row.notifyOnSuccess,
    notifyOnFailure: row.notifyOnFailure,
    lastRunAt: row.lastRunAt ?? undefined,
    nextRunAt: row.nextRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toRunDomain(row: ScheduledAgentRunRow): ScheduledAgentRun {
  return {
    id: row.id,
    scheduledAgentId: row.scheduledAgentId,
    agentExecutionId: row.agentExecutionId ?? undefined,
    status: row.status as ScheduledAgentRunStatus,
    result: row.result ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    totalTokens: row.totalTokens,
    durationMs: row.durationMs ?? undefined,
    triggeredBy: row.triggeredBy as ScheduledAgentTriggeredBy,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  }
}

export class ScheduledAgentStoreAdapter implements ScheduledAgentStorePort {
  constructor(private readonly db: Database) {}

  async insert(agent: Omit<ScheduledAgent, 'id'>): Promise<ScheduledAgent> {
    const [row] = await this.db.insert(scheduledAgents).values({
      id: randomUUID(),
      userId: agent.userId,
      agentId: agent.agentId,
      cronExpression: agent.cronExpression,
      input: agent.input,
      enabled: agent.enabled,
      notifyOnSuccess: agent.notifyOnSuccess,
      notifyOnFailure: agent.notifyOnFailure,
      lastRunAt: agent.lastRunAt ?? null,
      nextRunAt: agent.nextRunAt,
    }).returning()

    return toAgentDomain(row)
  }

  async listByUser(userId: string): Promise<ScheduledAgent[]> {
    const rows = await this.db
      .select()
      .from(scheduledAgents)
      .where(eq(scheduledAgents.userId, userId))
      .orderBy(desc(scheduledAgents.createdAt))

    return rows.map(toAgentDomain)
  }

  async getById(id: string): Promise<ScheduledAgent | null> {
    const [row] = await this.db
      .select()
      .from(scheduledAgents)
      .where(eq(scheduledAgents.id, id))

    return row ? toAgentDomain(row) : null
  }

  async update(id: string, data: Partial<Omit<ScheduledAgent, 'id' | 'userId' | 'createdAt'>>): Promise<ScheduledAgent> {
    const values: Record<string, unknown> = {}

    if (data.cronExpression !== undefined) values.cronExpression = data.cronExpression
    if (data.input !== undefined) values.input = data.input
    if (data.enabled !== undefined) values.enabled = data.enabled
    if (data.notifyOnSuccess !== undefined) values.notifyOnSuccess = data.notifyOnSuccess
    if (data.notifyOnFailure !== undefined) values.notifyOnFailure = data.notifyOnFailure
    if (data.lastRunAt !== undefined) values.lastRunAt = data.lastRunAt
    if (data.nextRunAt !== undefined) values.nextRunAt = data.nextRunAt
    if (data.updatedAt !== undefined) values.updatedAt = data.updatedAt

    const [row] = await this.db
      .update(scheduledAgents)
      .set(values)
      .where(eq(scheduledAgents.id, id))
      .returning()

    if (!row) throw new Error(`ScheduledAgent not found: ${id}`)
    return toAgentDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(scheduledAgents).where(eq(scheduledAgents.id, id))
  }

  async listDue(now: Date): Promise<ScheduledAgent[]> {
    const rows = await this.db
      .select()
      .from(scheduledAgents)
      .where(
        and(
          eq(scheduledAgents.enabled, true),
          lte(scheduledAgents.nextRunAt, now),
        ),
      )

    return rows.map(toAgentDomain)
  }

  async recordRun(run: Omit<ScheduledAgentRun, 'id'>): Promise<ScheduledAgentRun> {
    const [row] = await this.db.insert(scheduledAgentRuns).values({
      id: randomUUID(),
      scheduledAgentId: run.scheduledAgentId,
      agentExecutionId: run.agentExecutionId ?? null,
      status: run.status,
      result: run.result ?? null,
      errorMessage: run.errorMessage ?? null,
      totalTokens: run.totalTokens,
      durationMs: run.durationMs ?? null,
      triggeredBy: run.triggeredBy,
      completedAt: run.completedAt ?? null,
    }).returning()

    return toRunDomain(row)
  }

  async updateRun(id: string, data: Partial<Omit<ScheduledAgentRun, 'id' | 'scheduledAgentId' | 'createdAt'>>): Promise<ScheduledAgentRun> {
    const values: Record<string, unknown> = {}

    if (data.agentExecutionId !== undefined) values.agentExecutionId = data.agentExecutionId
    if (data.status !== undefined) values.status = data.status
    if (data.result !== undefined) values.result = data.result
    if (data.errorMessage !== undefined) values.errorMessage = data.errorMessage
    if (data.totalTokens !== undefined) values.totalTokens = data.totalTokens
    if (data.durationMs !== undefined) values.durationMs = data.durationMs
    if (data.completedAt !== undefined) values.completedAt = data.completedAt

    const [row] = await this.db
      .update(scheduledAgentRuns)
      .set(values)
      .where(eq(scheduledAgentRuns.id, id))
      .returning()

    if (!row) throw new Error(`ScheduledAgentRun not found: ${id}`)
    return toRunDomain(row)
  }

  async listRunsBySchedule(scheduledAgentId: string, limit = 20): Promise<ScheduledAgentRun[]> {
    const rows = await this.db
      .select()
      .from(scheduledAgentRuns)
      .where(eq(scheduledAgentRuns.scheduledAgentId, scheduledAgentId))
      .orderBy(desc(scheduledAgentRuns.createdAt))
      .limit(limit)

    return rows.map(toRunDomain)
  }
}
