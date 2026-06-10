# Agent Marketplace

## Proposal

Users can publish agents as installable "apps", creating a public directory of reusable AI configurations. Publishing snapshots the agent's system prompt, tools, and config; other users install a copy into their workspace. Publishers can push versioned updates; installed users receive notifications.

## Requirements

1. A user MUST be able to publish any agent they own, creating a `PublishedAgent` snapshot.
2. `PublishedAgent` MUST capture: agentId, publisherId, name, description, category, tags, systemPromptSnapshot, toolIdsSnapshot, configSnapshot, version, installCount, averageRating, isPublic, publishedAt.
3. Published agents MUST be browsable without authentication.
4. Authenticated users MUST be able to install a published agent (creates new agents row for installer).
5. The system MUST prevent duplicate installs (same user, same published agent) — return 409.
6. Publishers MUST be able to push version updates; all installs' `latestVersion` MUST be updated.
7. The UI MUST show an update badge when `installedVersion < latestVersion`.
8. Users MUST be able to rate (1-5 stars, one per user per agent); averageRating MUST be recomputed.
9. Publishers MUST be able to unpublish (isPublic=false); existing installs remain functional.
10. The catalog MUST support filtering by category and full-text search on name, description, tags.
11. Search SHOULD be case-insensitive with partial matches.
12. installCount MUST be incremented atomically on each successful install.

## Scenarios

### Scenario 1 — Publish an agent

```
Given user owns ag-001
When POST /api/marketplace/publish with { agentId, category, tags, description }
Then published_agents row created with version=1, isPublic=true, installCount=0; 201.
```

### Scenario 2 — Browse catalog

```
When GET /api/marketplace?category=productivity&q=summarizer (unauthenticated)
Then paginated list of matching public agents.
```

### Scenario 3 — Install an agent

```
Given pub-001 at version 2, user-B authenticated
When POST /api/marketplace/pub-001/install
Then new agents row for user-B; agent_installs row; installCount +1; 201.
```

### Scenario 4 — Publisher pushes update

```
Given pub-001 at version 2, user-B installed at v2
When POST /api/marketplace/pub-001/update
Then version bumped to 3; all installs.latestVersion = 3; user-B sees badge.
```

### Scenario 5 — Rate an agent

```
Given user-B installed pub-001
When POST /api/marketplace/pub-001/rate with { rating: 5 }
Then agent_ratings row created; averageRating recomputed; second call returns 409.
```

### Scenario 6 — Duplicate install

```
Given user-B already has pub-001
When POST /api/marketplace/pub-001/install
Then 409 { error: "Already installed" }.
```

## Data Model

### published_agents

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK -> agents(id) |
| publisher_id | TEXT | NOT NULL (email) |
| name | TEXT | NOT NULL |
| description | TEXT | DEFAULT '' |
| category | TEXT | DEFAULT 'general' |
| tags | JSONB | DEFAULT '[]' |
| system_prompt_snapshot | TEXT | NOT NULL |
| tool_ids_snapshot | JSONB | DEFAULT '[]' |
| config_snapshot | JSONB | NOT NULL |
| version | INTEGER | DEFAULT 1 |
| install_count | INTEGER | DEFAULT 0 |
| average_rating | NUMERIC(3,2) | DEFAULT 0 |
| is_public | BOOLEAN | DEFAULT true |
| published_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### agent_installs

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| published_agent_id | UUID | FK -> published_agents(id) |
| installer_id | TEXT | NOT NULL (email) |
| installed_agent_id | UUID | FK -> agents(id) |
| installed_version | INTEGER | NOT NULL |
| latest_version | INTEGER | NOT NULL |
| installed_at | TIMESTAMP | DEFAULT NOW() |
| | | UNIQUE(published_agent_id, installer_id) |

### agent_ratings

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| published_agent_id | UUID | FK -> published_agents(id) |
| rater_id | TEXT | NOT NULL (email) |
| rating | INTEGER | CHECK (1-5) |
| created_at | TIMESTAMP | DEFAULT NOW() |
| | | UNIQUE(published_agent_id, rater_id) |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/marketplace | optional | Browse catalog |
| GET | /api/marketplace/[pubId] | optional | Agent detail |
| POST | /api/marketplace/publish | required | Publish agent |
| POST | /api/marketplace/[pubId]/install | required | Install |
| POST | /api/marketplace/[pubId]/update | publisher | Push update |
| DELETE | /api/marketplace/[pubId] | publisher | Unpublish |
| POST | /api/marketplace/[pubId]/rate | required | Rate 1-5 |
| GET | /api/marketplace/mine | required | My published |

## Key Files

### New

- `src/core/domain/entities/published-agent.ts`
- `src/core/ports/out/marketplace-store.port.ts`
- `src/core/usecases/marketplace.usecase.ts`
- `src/adapters/db/marketplace-store.adapter.ts`
- `src/app/api/marketplace/` — 8 route files
- `src/app/(app)/marketplace/page.tsx`
- `src/components/marketplace/agent-card.tsx`

### Modified

- `src/adapters/db/schema.ts` — add 3 tables
- `src/config/container.ts` — wire marketplaceUseCase
- Sidebar — add Marketplace nav item
