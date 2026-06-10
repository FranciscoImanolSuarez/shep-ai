import type { AuditEvent, EventType } from '@/core/domain/entities/audit-event'

export interface AuditQueryFilters {
  eventType?: EventType
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export interface AuditTimeBucket {
  bucket: string
  tokenCount: number
  costUsd: number
  eventCount: number
}

export interface AuditSummary {
  totalTokens: number
  totalCostUsd: number
  eventCounts: Record<EventType, number>
}

export interface TopAgent {
  agentId: string
  name: string
  runCount: number
  tokenCount: number
}

export interface TopDocument {
  source: string
  queryCount: number
}

export interface AuditAggregateResult {
  summary: AuditSummary
  timeSeries: AuditTimeBucket[]
  topAgents: TopAgent[]
  topDocuments: TopDocument[]
}

export interface AuditStorePort {
  record(event: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<void>
  query(userId: string, filters?: AuditQueryFilters): Promise<AuditEvent[]>
  aggregate(
    userId: string,
    range: { from: Date; to: Date },
    granularity: 'day' | 'week' | 'month',
  ): Promise<AuditAggregateResult>
}
