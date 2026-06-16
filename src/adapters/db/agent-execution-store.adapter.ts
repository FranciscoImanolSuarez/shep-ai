import { eq, desc } from 'drizzle-orm'
import type { AgentExecutionStorePort } from '@/core/ports/out/agent-execution-store.port'
import type { AgentExecution } from '@/core/domain/entities/agent-execution'
import type { Message } from '@/core/domain/entities/message'
import type { AgentStep } from '@/core/domain/entities/agent-execution'
import { agentExecutions } from './schema'
import type { Database } from './connection'

export class AgentExecutionStoreAdapter implements AgentExecutionStorePort {
  constructor(private readonly db: Database) {}

  async save(execution: AgentExecution): Promise<AgentExecution> {
    const [row] = await this.db.insert(agentExecutions).values({
      id: execution.id,
      agentId: execution.agentId,
      status: execution.status,
      input: execution.input as unknown[],
      steps: execution.steps as unknown[],
      result: execution.result ?? null,
      totalTokens: execution.totalTokens,
      parentExecutionId: execution.parentExecutionId ?? null,
      traceId: execution.traceId ?? null,
      completedAt: execution.completedAt ?? null,
    }).returning()

    return this.toDomain(row)
  }

  async findById(id: string): Promise<AgentExecution | null> {
    const [row] = await this.db.select().from(agentExecutions).where(eq(agentExecutions.id, id))
    return row ? this.toDomain(row) : null
  }

  async findByAgentId(agentId: string, limit = 20): Promise<AgentExecution[]> {
    const rows = await this.db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.agentId, agentId))
      .orderBy(desc(agentExecutions.createdAt))
      .limit(limit)

    return rows.map((r) => this.toDomain(r))
  }

  async findByParentId(parentId: string): Promise<AgentExecution[]> {
    const rows = await this.db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.parentExecutionId, parentId))
      .orderBy(desc(agentExecutions.createdAt))
      .limit(50)

    return rows.map((r) => this.toDomain(r))
  }

  async update(id: string, data: Partial<Omit<AgentExecution, 'id' | 'agentId' | 'createdAt'>>): Promise<AgentExecution> {
    const values: Record<string, unknown> = {}
    if (data.status !== undefined) values.status = data.status
    if (data.steps !== undefined) values.steps = data.steps as unknown[]
    if (data.result !== undefined) values.result = data.result
    if (data.totalTokens !== undefined) values.totalTokens = data.totalTokens
    if (data.traceId !== undefined) values.traceId = data.traceId
    if (data.completedAt !== undefined) values.completedAt = data.completedAt

    const [row] = await this.db
      .update(agentExecutions)
      .set(values)
      .where(eq(agentExecutions.id, id))
      .returning()

    if (!row) throw new Error(`AgentExecution not found: ${id}`)
    return this.toDomain(row)
  }

  private toDomain(row: typeof agentExecutions.$inferSelect): AgentExecution {
    return {
      id: row.id,
      agentId: row.agentId,
      status: row.status as AgentExecution['status'],
      input: (row.input ?? []) as Message[],
      steps: (row.steps ?? []) as AgentStep[],
      result: row.result ?? undefined,
      totalTokens: row.totalTokens,
      parentExecutionId: row.parentExecutionId ?? undefined,
      traceId: row.traceId ?? undefined,
      createdAt: row.createdAt,
      completedAt: row.completedAt ?? undefined,
    }
  }
}
