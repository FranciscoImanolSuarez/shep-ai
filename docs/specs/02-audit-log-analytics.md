# Audit Log / Analytics

## Proposal

Every significant user action is written as an `AuditEvent` row (fire-and-forget, non-blocking) at the instrumentation point closest to the raw data. An analytics API aggregates these rows into time-bucketed summaries. The dashboard reuses the already-built `chart` and `metrics` rich-content renderers to display token burn rate, per-agent costs, and usage trends.

## Requirements

1. The system MUST write an `AuditEvent` for: `chat_message`, `agent_run`, `rag_query`, `document_upload`, `agent_delegation`.
2. Every event MUST capture `userId`, `eventType`, `metadata` (JSONB), `tokenCount`, `costUsd` (nullable), and `createdAt`.
3. Audit writes MUST be fire-and-forget; they MUST NOT delay the primary operation.
4. The analytics API MUST support time-range queries (`from`, `to`) with granularity `day | week | month`.
5. The analytics API MUST return total tokens, total cost, event counts by type, top 5 agents by run count, top 5 agents by token usage, top 5 documents by RAG hit count.
6. All analytics endpoints MUST be scoped to the authenticated user.
7. The `audit_events` table MUST have a composite index on `(user_id, created_at DESC)` and a partial index on `(event_type, created_at)`.
8. The dashboard MUST render: token-usage line chart, event-type breakdown bar chart, cost summary metrics block, and top-agents list.
9. The UI MUST provide a time-period selector (7d / 30d / 90d / custom).
10. The system SHOULD compute `costUsd` at write time using a static `MODEL_COST_PER_1K_TOKENS` map.
11. Instrumentation MUST live inside existing usecases/routes, NOT middleware.
12. `agent_delegation` events MUST capture `parentAgentId`, `childAgentId`, and `depth` in metadata.

## Scenarios

### Scenario 1 — Chat message audit

```
Given a user sends a chat message
When the streamText response finishes
Then one audit_events row is written with eventType: 'chat_message', tokenCount from usage, costUsd computed; user's response is not delayed.
```

### Scenario 2 — Agent run audit

```
Given AgentUseCase.runAgentToCompletion completes
When the execution record is persisted
Then an AuditEvent with eventType: 'agent_run' and metadata: { agentId, executionId, steps } is written fire-and-forget.
```

### Scenario 3 — Delegation audit

```
Given createDelegateAgentTool invokes a child agent
When the child execution completes
Then AuditEvent with eventType: 'agent_delegation', metadata: { parentAgentId, childAgentId, depth } is written.
```

### Scenario 4 — Analytics time-range query

```
Given a user with 45 days of audit data
When GET /api/analytics?from=2025-03-01&to=2025-03-31&granularity=day
Then 31 daily buckets are returned with tokenCount, costUsd, eventCount; other users' data excluded.
```

### Scenario 5 — Dashboard renders on load

```
Given an authenticated user navigates to /analytics
When the page mounts
Then 30-day default stats are fetched and rendered into charts and metrics blocks.
```

### Scenario 6 — Zero data state

```
Given a new user with no audit events
When the analytics dashboard loads
Then charts render empty-state placeholders; no errors thrown.
```

### Scenario 7 — Audit write failure does not affect user

```
Given the audit DB write fails
When a chat message streams normally
Then the response is delivered without error; the failure is logged server-side only.
```

## Data Model

### audit_events

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| user_id | TEXT | NOT NULL |
| event_type | TEXT | NOT NULL |
| metadata | JSONB | NOT NULL, DEFAULT '{}' |
| token_count | INTEGER | NOT NULL, DEFAULT 0 |
| cost_usd | NUMERIC(10,6) | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Indexes: `(user_id, created_at DESC)`, `(event_type, created_at DESC)`, BRIN on `created_at`

## Instrumentation Points

| Location | Event | Key metadata |
|----------|-------|--------------|
| `src/app/api/chat/route.ts` | chat_message | model, provider, tokenCount |
| `src/core/usecases/agent.usecase.ts` | agent_run | agentId, executionId, totalTokens |
| `src/core/tools/builtin/delegate-agent.tool.ts` | agent_delegation | parentAgentId, childAgentId, depth |
| RAG query handler | rag_query | query, docsReturned, tokenCount |
| Document ingest handler | document_upload | source, chunkCount |

## Analytics API Response Shape

```typescript
{
  summary: { totalTokens, totalCostUsd, eventCounts: Record<EventType, number> }
  timeSeries: Array<{ bucket: string, tokenCount, costUsd, eventCount }>
  topAgents: Array<{ agentId, name, runCount, tokenCount }>
  topDocuments: Array<{ source, queryCount }>
}
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/analytics | session | Aggregated stats (from, to, granularity) |
| GET | /api/analytics/events | session | Paginated raw events |

## Key Files

### New

- `src/core/domain/entities/audit-event.ts` — entity + MODEL_COST_PER_1K_TOKENS
- `src/core/ports/out/audit-store.port.ts`
- `src/adapters/db/audit-store.adapter.ts`
- `src/app/api/analytics/route.ts`
- `src/app/api/analytics/events/route.ts`
- `src/app/(app)/analytics/page.tsx`
- `src/components/analytics/analytics-dashboard.tsx`

### Modified

- `src/adapters/db/schema.ts` — add auditEvents table
- `src/config/container.ts` — wire AuditStoreAdapter
- `src/app/api/chat/route.ts` — fire-and-forget audit
- `src/core/usecases/agent.usecase.ts` — fire-and-forget audit
- `src/core/tools/builtin/delegate-agent.tool.ts` — fire-and-forget audit
