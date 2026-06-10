import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { AuditStorePort, AuditQueryFilters, AuditAggregateResult } from '@/core/ports/out/audit-store.port'
import type { AuditEvent, EventType } from '@/core/domain/entities/audit-event'
import { auditEvents, agents } from './schema'
import type { Database } from './connection'

type AuditEventRow = typeof auditEvents.$inferSelect

function toDomain(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    userId: row.userId,
    eventType: row.eventType as EventType,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    tokenCount: row.tokenCount,
    costUsd: row.costUsd != null ? parseFloat(row.costUsd) : undefined,
    createdAt: row.createdAt,
  }
}

export class AuditStoreAdapter implements AuditStorePort {
  constructor(private readonly db: Database) {}

  async record(event: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<void> {
    await this.db.insert(auditEvents).values({
      id: randomUUID(),
      userId: event.userId,
      eventType: event.eventType,
      metadata: event.metadata,
      tokenCount: event.tokenCount,
      costUsd: event.costUsd != null ? String(event.costUsd) : null,
    })
  }

  async query(userId: string, filters?: AuditQueryFilters): Promise<AuditEvent[]> {
    const conditions = [eq(auditEvents.userId, userId)]

    if (filters?.from) conditions.push(gte(auditEvents.createdAt, filters.from))
    if (filters?.to) conditions.push(lte(auditEvents.createdAt, filters.to))
    if (filters?.eventType) conditions.push(eq(auditEvents.eventType, filters.eventType))

    const rows = await this.db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.createdAt))
      .limit(filters?.limit ?? 100)
      .offset(filters?.offset ?? 0)

    return rows.map(toDomain)
  }

  async aggregate(
    userId: string,
    range: { from: Date; to: Date },
    granularity: 'day' | 'week' | 'month',
  ): Promise<AuditAggregateResult> {
    const baseCondition = and(
      eq(auditEvents.userId, userId),
      gte(auditEvents.createdAt, range.from),
      lte(auditEvents.createdAt, range.to),
    )

    // Summary: totals + per-type counts
    const summaryRows = await this.db
      .select({
        eventType: auditEvents.eventType,
        totalTokens: sql<number>`SUM(${auditEvents.tokenCount})::int`,
        totalCost: sql<string>`SUM(${auditEvents.costUsd})`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(auditEvents)
      .where(baseCondition)
      .groupBy(auditEvents.eventType)

    const allTypes: EventType[] = ['chat_message', 'agent_run', 'rag_query', 'document_upload', 'agent_delegation']
    const eventCounts = Object.fromEntries(allTypes.map((t) => [t, 0])) as Record<EventType, number>
    let totalTokens = 0
    let totalCostUsd = 0

    for (const row of summaryRows) {
      eventCounts[row.eventType as EventType] = row.count
      totalTokens += row.totalTokens ?? 0
      totalCostUsd += row.totalCost != null ? parseFloat(row.totalCost) : 0
    }

    // Time series bucketed by granularity
    const timeSeriesRows = await this.db.execute(
      sql`
        SELECT
          date_trunc(${granularity}, ${auditEvents.createdAt}) AS bucket,
          SUM(${auditEvents.tokenCount})::int AS token_count,
          SUM(${auditEvents.costUsd}) AS cost_usd,
          COUNT(*)::int AS event_count
        FROM ${auditEvents}
        WHERE
          ${auditEvents.userId} = ${userId}
          AND ${auditEvents.createdAt} >= ${range.from}
          AND ${auditEvents.createdAt} <= ${range.to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    )

    const timeSeries = (timeSeriesRows as Array<Record<string, unknown>>).map((row) => ({
      bucket: row.bucket instanceof Date ? row.bucket.toISOString() : String(row.bucket),
      tokenCount: Number(row.token_count ?? 0),
      costUsd: row.cost_usd != null ? parseFloat(String(row.cost_usd)) : 0,
      eventCount: Number(row.event_count ?? 0),
    }))

    // Top agents by run count
    const topAgentRows = await this.db.execute(
      sql`
        SELECT
          ${auditEvents.metadata}->>'agentId' AS agent_id,
          ${agents.name} AS agent_name,
          COUNT(*)::int AS run_count,
          SUM(${auditEvents.tokenCount})::int AS token_count
        FROM ${auditEvents}
        LEFT JOIN ${agents} ON ${agents.id}::text = ${auditEvents.metadata}->>'agentId'
        WHERE
          ${auditEvents.userId} = ${userId}
          AND ${auditEvents.createdAt} >= ${range.from}
          AND ${auditEvents.createdAt} <= ${range.to}
          AND ${auditEvents.eventType} IN ('agent_run', 'agent_delegation')
          AND ${auditEvents.metadata}->>'agentId' IS NOT NULL
        GROUP BY agent_id, agent_name
        ORDER BY run_count DESC
        LIMIT 5
      `,
    )

    const topAgents = (topAgentRows as Array<Record<string, unknown>>).map((row) => ({
      agentId: String(row.agent_id ?? ''),
      name: row.agent_name != null ? String(row.agent_name) : String(row.agent_id ?? 'Unknown'),
      runCount: Number(row.run_count ?? 0),
      tokenCount: Number(row.token_count ?? 0),
    }))

    // Top documents by RAG query count
    const topDocRows = await this.db.execute(
      sql`
        SELECT
          ${auditEvents.metadata}->>'source' AS source,
          COUNT(*)::int AS query_count
        FROM ${auditEvents}
        WHERE
          ${auditEvents.userId} = ${userId}
          AND ${auditEvents.createdAt} >= ${range.from}
          AND ${auditEvents.createdAt} <= ${range.to}
          AND ${auditEvents.eventType} = 'rag_query'
          AND ${auditEvents.metadata}->>'source' IS NOT NULL
        GROUP BY source
        ORDER BY query_count DESC
        LIMIT 5
      `,
    )

    const topDocuments = (topDocRows as Array<Record<string, unknown>>).map((row) => ({
      source: String(row.source ?? ''),
      queryCount: Number(row.query_count ?? 0),
    }))

    return {
      summary: { totalTokens, totalCostUsd, eventCounts },
      timeSeries,
      topAgents,
      topDocuments,
    }
  }
}
