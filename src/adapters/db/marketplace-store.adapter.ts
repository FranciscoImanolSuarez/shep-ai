import { eq, and, ilike, or, sql, desc } from 'drizzle-orm'
import type { MarketplaceStorePort, BrowseFilters } from '@/core/ports/out/marketplace-store.port'
import type { PublishedAgent, AgentInstall, AgentRating, AgentConfigSnapshot } from '@/core/domain/entities/published-agent'
import { publishedAgents, agentInstalls, agentRatings } from './schema'
import type { Database } from './connection'

type PublishedAgentRow = typeof publishedAgents.$inferSelect
type AgentInstallRow = typeof agentInstalls.$inferSelect
type AgentRatingRow = typeof agentRatings.$inferSelect

function toPublishedDomain(row: PublishedAgentRow): PublishedAgent {
  return {
    id: row.id,
    agentId: row.agentId ?? '',
    publisherId: row.publisherId,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: (row.tags as string[]) ?? [],
    systemPromptSnapshot: row.systemPromptSnapshot,
    toolIdsSnapshot: (row.toolIdsSnapshot as string[]) ?? [],
    configSnapshot: row.configSnapshot as AgentConfigSnapshot,
    version: row.version,
    installCount: row.installCount,
    averageRating: parseFloat(row.averageRating ?? '0'),
    isPublic: row.isPublic,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  }
}

function toInstallDomain(row: AgentInstallRow): AgentInstall {
  return {
    id: row.id,
    publishedAgentId: row.publishedAgentId,
    installerId: row.installerId,
    installedAgentId: row.installedAgentId,
    installedVersion: row.installedVersion,
    latestVersion: row.latestVersion,
    installedAt: row.installedAt,
  }
}

function toRatingDomain(row: AgentRatingRow): AgentRating {
  return {
    id: row.id,
    publishedAgentId: row.publishedAgentId,
    raterId: row.raterId,
    rating: row.rating,
    createdAt: row.createdAt,
  }
}

export class MarketplaceStoreAdapter implements MarketplaceStorePort {
  constructor(private readonly db: Database) {}

  async insertPublished(agent: PublishedAgent): Promise<PublishedAgent> {
    const [row] = await this.db.insert(publishedAgents).values({
      id: agent.id,
      agentId: agent.agentId || null,
      publisherId: agent.publisherId,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      tags: agent.tags,
      systemPromptSnapshot: agent.systemPromptSnapshot,
      toolIdsSnapshot: agent.toolIdsSnapshot,
      configSnapshot: agent.configSnapshot,
      version: agent.version,
      installCount: agent.installCount,
      averageRating: String(agent.averageRating),
      isPublic: agent.isPublic,
      publishedAt: agent.publishedAt,
      updatedAt: agent.updatedAt,
    }).returning()

    return toPublishedDomain(row)
  }

  async listPublic(filters: BrowseFilters): Promise<PublishedAgent[]> {
    const { q, category, limit = 20, offset = 0 } = filters

    const conditions = [eq(publishedAgents.isPublic, true)]

    if (q) {
      conditions.push(
        or(
          ilike(publishedAgents.name, `%${q}%`),
          ilike(publishedAgents.description, `%${q}%`),
          sql`${publishedAgents.tags}::text ILIKE ${'%' + q + '%'}`,
        )!,
      )
    }

    if (category) {
      conditions.push(eq(publishedAgents.category, category))
    }

    const rows = await this.db
      .select()
      .from(publishedAgents)
      .where(and(...conditions))
      .orderBy(desc(publishedAgents.installCount), desc(publishedAgents.publishedAt))
      .limit(limit)
      .offset(offset)

    return rows.map(toPublishedDomain)
  }

  async getById(id: string): Promise<PublishedAgent | null> {
    const [row] = await this.db
      .select()
      .from(publishedAgents)
      .where(eq(publishedAgents.id, id))

    return row ? toPublishedDomain(row) : null
  }

  async updatePublished(
    id: string,
    data: Partial<Omit<PublishedAgent, 'id' | 'publishedAt'>>,
  ): Promise<PublishedAgent> {
    const values: Record<string, unknown> = {}

    if (data.name !== undefined) values.name = data.name
    if (data.description !== undefined) values.description = data.description
    if (data.category !== undefined) values.category = data.category
    if (data.tags !== undefined) values.tags = data.tags
    if (data.systemPromptSnapshot !== undefined) values.systemPromptSnapshot = data.systemPromptSnapshot
    if (data.toolIdsSnapshot !== undefined) values.toolIdsSnapshot = data.toolIdsSnapshot
    if (data.configSnapshot !== undefined) values.configSnapshot = data.configSnapshot
    if (data.version !== undefined) values.version = data.version
    if (data.installCount !== undefined) values.installCount = data.installCount
    if (data.averageRating !== undefined) values.averageRating = String(data.averageRating)
    if (data.isPublic !== undefined) values.isPublic = data.isPublic
    if (data.updatedAt !== undefined) values.updatedAt = data.updatedAt

    const [row] = await this.db
      .update(publishedAgents)
      .set(values)
      .where(eq(publishedAgents.id, id))
      .returning()

    if (!row) throw new Error(`PublishedAgent not found: ${id}`)
    return toPublishedDomain(row)
  }

  async deletePublished(id: string): Promise<void> {
    await this.db.delete(publishedAgents).where(eq(publishedAgents.id, id))
  }

  async listByPublisher(publisherId: string): Promise<PublishedAgent[]> {
    const rows = await this.db
      .select()
      .from(publishedAgents)
      .where(eq(publishedAgents.publisherId, publisherId))
      .orderBy(desc(publishedAgents.publishedAt))

    return rows.map(toPublishedDomain)
  }

  async incrementInstallCount(id: string): Promise<void> {
    await this.db
      .update(publishedAgents)
      .set({ installCount: sql`install_count + 1` })
      .where(eq(publishedAgents.id, id))
  }

  async insertInstall(install: AgentInstall): Promise<AgentInstall> {
    const [row] = await this.db.insert(agentInstalls).values({
      id: install.id,
      publishedAgentId: install.publishedAgentId,
      installerId: install.installerId,
      installedAgentId: install.installedAgentId,
      installedVersion: install.installedVersion,
      latestVersion: install.latestVersion,
      installedAt: install.installedAt,
    }).returning()

    return toInstallDomain(row)
  }

  async getInstall(publishedAgentId: string, installerId: string): Promise<AgentInstall | null> {
    const [row] = await this.db
      .select()
      .from(agentInstalls)
      .where(
        and(
          eq(agentInstalls.publishedAgentId, publishedAgentId),
          eq(agentInstalls.installerId, installerId),
        ),
      )

    return row ? toInstallDomain(row) : null
  }

  async listInstallsByPublished(publishedAgentId: string): Promise<AgentInstall[]> {
    const rows = await this.db
      .select()
      .from(agentInstalls)
      .where(eq(agentInstalls.publishedAgentId, publishedAgentId))
      .limit(100)

    return rows.map(toInstallDomain)
  }

  async updateInstallsLatestVersion(publishedAgentId: string, latestVersion: number): Promise<void> {
    await this.db
      .update(agentInstalls)
      .set({ latestVersion })
      .where(eq(agentInstalls.publishedAgentId, publishedAgentId))
  }

  async insertRating(rating: AgentRating): Promise<AgentRating> {
    const [row] = await this.db.insert(agentRatings).values({
      id: rating.id,
      publishedAgentId: rating.publishedAgentId,
      raterId: rating.raterId,
      rating: rating.rating,
      createdAt: rating.createdAt,
    }).returning()

    return toRatingDomain(row)
  }

  async getRating(publishedAgentId: string, raterId: string): Promise<AgentRating | null> {
    const [row] = await this.db
      .select()
      .from(agentRatings)
      .where(
        and(
          eq(agentRatings.publishedAgentId, publishedAgentId),
          eq(agentRatings.raterId, raterId),
        ),
      )

    return row ? toRatingDomain(row) : null
  }

  async recomputeAverageRating(publishedAgentId: string): Promise<number> {
    const result = await this.db
      .select({ avg: sql<string>`AVG(rating)` })
      .from(agentRatings)
      .where(eq(agentRatings.publishedAgentId, publishedAgentId))

    const avg = parseFloat(result[0]?.avg ?? '0')
    const rounded = Math.round(avg * 100) / 100

    await this.db
      .update(publishedAgents)
      .set({ averageRating: String(rounded) })
      .where(eq(publishedAgents.id, publishedAgentId))

    return rounded
  }
}
