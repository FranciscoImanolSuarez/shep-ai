import { eq, and, or, isNull, inArray } from 'drizzle-orm'
import type { AgentStorePort } from '@/core/ports/out/agent-store.port'
import type { Agent } from '@/core/domain/entities/agent'
import { agents } from './schema'
import type { Database } from './connection'

export class AgentStoreAdapter implements AgentStorePort {
  constructor(private readonly db: Database) {}

  async save(agent: Agent): Promise<Agent> {
    const [row] = await this.db.insert(agents).values({
      id: agent.id,
      knowledgeBaseId: agent.knowledgeBaseId ?? null,
      workspaceId: agent.workspaceId ?? null,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      provider: agent.provider,
      toolIds: agent.toolIds,
      config: agent.config,
      metadata: agent.metadata,
    }).returning()

    return this.toDomain(row)
  }

  async findById(id: string): Promise<Agent | null> {
    const [row] = await this.db.select().from(agents).where(eq(agents.id, id))
    return row ? this.toDomain(row) : null
  }

  /** T3.3: Workspace-scoped lookup — returns null if agent exists but in a different workspace. */
  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Agent | null> {
    const [row] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
    return row ? this.toDomain(row) : null
  }

  async findByIdsAndWorkspace(ids: string[], workspaceId: string): Promise<Agent[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(agents)
      .where(and(inArray(agents.id, ids), eq(agents.workspaceId, workspaceId)))
    return rows.map((r) => this.toDomain(r))
  }

  async findAll(): Promise<Agent[]> {
    const rows = await this.db.select().from(agents).limit(500)
    return rows.map((r) => this.toDomain(r))
  }

  async findByWorkspace(workspaceId: string): Promise<Agent[]> {
    const rows = await this.db
      .select()
      .from(agents)
      .where(or(eq(agents.workspaceId, workspaceId), isNull(agents.workspaceId)))
    return rows.map((r) => this.toDomain(r))
  }

  async update(id: string, data: Partial<Omit<Agent, 'id' | 'createdAt'>>): Promise<Agent> {
    const [row] = await this.db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning()

    if (!row) throw new Error(`Agent not found: ${id}`)
    return this.toDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(agents).where(eq(agents.id, id))
  }

  private toDomain(row: typeof agents.$inferSelect): Agent {
    const storedConfig = (row.config ?? { maxSteps: 10, temperature: 0.7, toolChoice: 'auto' }) as Agent['config']
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId ?? null,
      workspaceId: row.workspaceId ?? null,
      name: row.name,
      description: row.description,
      systemPrompt: row.systemPrompt,
      model: row.model,
      provider: row.provider as Agent['provider'],
      toolIds: (row.toolIds ?? []) as string[],
      config: { ...storedConfig, maxDelegationDepth: storedConfig.maxDelegationDepth ?? 3 },
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
