# Scheduled Agents (Cron Jobs)

## Proposal

Users can register a recurring schedule for any agent, providing a cron expression and an input payload. At each trigger point a headless execution is invoked via `AgentUseCase.runAgentToCompletion`, the result is persisted in `scheduled_agent_runs`, and a dashboard notification is generated. In production, Vercel Cron calls a protected internal API route; in development a lightweight in-process poller serves the same contract.

## Requirements

1. The system MUST store a `ScheduledAgent` record associating an `agentId`, a valid cron expression, a serialised input payload, an `enabled` flag, `lastRunAt`, `nextRunAt`, and a `userId` owner.
2. A `userId` MUST be present on every scheduled agent; unauthenticated requests MUST be rejected with HTTP 401.
3. The system MUST expose CRUD endpoints for scheduled agents scoped to the authenticated user.
4. The system MUST expose a manual-trigger endpoint that executes the agent synchronously and returns the result.
5. An execution runner MUST call `AgentUseCase.runAgentToCompletion` and persist a `ScheduledAgentRun` record (status, result text, token count, error message, duration).
6. A cron trigger route (`/api/cron/scheduled-agents`) MUST be protected by a shared secret (`CRON_SECRET`) verified via `Authorization: Bearer`; it MUST return HTTP 401 on mismatch.
7. The cron route MUST query all enabled schedules whose `nextRunAt <= now()`, run each with bounded parallelism <= 5, and update `lastRunAt` / `nextRunAt` after each run.
8. `nextRunAt` MUST be computed using a standard cron-expression library (e.g. `croner`).
9. The system SHOULD support per-schedule notification settings: `notifyOnSuccess`, `notifyOnFailure`.
10. Notifications MUST be persisted and shown in the dashboard. Email delivery is out of scope for v1.
11. The UI MUST provide a schedule management page with enable/disable toggle and manual-run button.
12. The UI MUST show a run history table per schedule (last 20 runs) with status, duration, and collapsible result preview.
13. Development SHOULD use a `setInterval` (60-second tick) calling the same handler function directly.

## Scenarios

### Scenario 1 — Create a schedule

```
Given an authenticated user with a valid agentId
When POST /api/scheduled-agents with { agentId, cronExpression: "0 9 * * 1", input: { task: "summarise" }, enabled: true }
Then a ScheduledAgent row is created, nextRunAt is the next Monday 09:00 UTC, HTTP 201 is returned.
```

### Scenario 2 — Cron trigger runs due schedules

```
Given two enabled schedules with nextRunAt in the past and one in the future
When Vercel Cron hits GET /api/cron/scheduled-agents with the correct bearer token
Then the two due schedules execute, their timestamps update, one ScheduledAgentRun row per execution is saved; the future schedule is untouched.
```

### Scenario 3 — Disabled schedule is skipped

```
Given a schedule with enabled: false and nextRunAt in the past
When the cron route runs
Then the schedule is not executed and timestamps are not updated.
```

### Scenario 4 — Manual trigger

```
Given an authenticated user who owns schedule {id}
When POST /api/scheduled-agents/{id}/run
Then the agent runs to completion, a ScheduledAgentRun row is created, and the result is returned synchronously.
```

### Scenario 5 — Unauthenticated access

```
Given no session cookie
When GET /api/scheduled-agents
Then HTTP 401, no data leaked.
```

### Scenario 6 — Invalid cron expression

```
Given an authenticated user
When POST with cronExpression: "not-a-cron"
Then HTTP 422 with a descriptive validation error; no row created.
```

## Data Model

### scheduled_agents

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| user_id | TEXT | NOT NULL |
| agent_id | UUID | NOT NULL, FK -> agents(id) CASCADE |
| cron_expression | TEXT | NOT NULL |
| input | JSONB | NOT NULL, DEFAULT '{}' |
| enabled | BOOLEAN | NOT NULL, DEFAULT true |
| notify_on_success | BOOLEAN | NOT NULL, DEFAULT false |
| notify_on_failure | BOOLEAN | NOT NULL, DEFAULT true |
| last_run_at | TIMESTAMPTZ | nullable |
| next_run_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Indexes: `user_id`, `next_run_at WHERE enabled = true`

### scheduled_agent_runs

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| scheduled_agent_id | UUID | NOT NULL, FK -> scheduled_agents(id) CASCADE |
| agent_execution_id | UUID | FK -> agent_executions(id) |
| status | TEXT | NOT NULL, DEFAULT 'running' |
| result | TEXT | nullable |
| error_message | TEXT | nullable |
| total_tokens | INTEGER | NOT NULL, DEFAULT 0 |
| duration_ms | INTEGER | nullable |
| triggered_by | TEXT | NOT NULL, DEFAULT 'cron' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| completed_at | TIMESTAMPTZ | nullable |

Index: `(scheduled_agent_id, created_at DESC)`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/scheduled-agents | session | List user's schedules |
| POST | /api/scheduled-agents | session | Create schedule |
| GET | /api/scheduled-agents/[id] | session+owner | Get schedule + last 20 runs |
| PATCH | /api/scheduled-agents/[id] | session+owner | Update (toggle, cron, input) |
| DELETE | /api/scheduled-agents/[id] | session+owner | Delete |
| POST | /api/scheduled-agents/[id]/run | session+owner | Manual trigger |
| GET | /api/cron/scheduled-agents | CRON_SECRET | Internal cron tick |

## Key Files

### New

- `src/core/domain/entities/scheduled-agent.ts`
- `src/core/ports/in/scheduled-agent.port.ts`
- `src/core/ports/out/scheduled-agent-store.port.ts`
- `src/core/usecases/scheduled-agent.usecase.ts`
- `src/adapters/db/scheduled-agent-store.adapter.ts`
- `src/app/api/scheduled-agents/route.ts`
- `src/app/api/scheduled-agents/[id]/route.ts`
- `src/app/api/scheduled-agents/[id]/run/route.ts`
- `src/app/api/cron/scheduled-agents/route.ts`
- `src/app/(app)/schedules/page.tsx`

### Modified

- `src/adapters/db/schema.ts` — add 2 tables
- `src/config/container.ts` — wire ScheduledAgentUseCase
- `vercel.json` — add cron entry
