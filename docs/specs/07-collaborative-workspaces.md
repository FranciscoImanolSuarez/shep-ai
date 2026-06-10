# Collaborative Workspaces

> **BREAKING CHANGE** — This feature touches every existing API route and requires a data migration. Implement last, behind a feature flag.

## Proposal

Multiple users can share a workspace with conversations, agents, documents, and knowledge bases. All existing resources are re-scoped from `userId` to `workspaceId`. A "Personal" workspace is auto-created for each existing user during migration. Role-based access control governs permissions.

## Requirements

1. The system MUST support creating named workspaces; each has one owner.
2. All resources (conversations, agents, documents) MUST belong to a workspaceId, not userId directly.
3. WorkspaceMember records MUST define each user's role: owner, admin, member, viewer.
4. Role permissions MUST be enforced:
   - **owner**: full control including delete workspace and transfer ownership
   - **admin**: manage members (invite/remove), CRUD all resources
   - **member**: CRUD resources; cannot manage members
   - **viewer**: read-only on all workspace resources
5. Migration MUST create a "Personal" workspace for every existing user and assign owner role.
6. All existing data rows MUST be migrated to the personal workspace of their userId.
7. Invitations MUST be by email; invitees see in-app notification on next login.
8. Invitations MUST expire after 7 days; accepting expired returns 410.
9. Users MUST belong to multiple workspaces and switch between them.
10. Active workspace MUST be persisted per-user.
11. UI MUST show a workspace switcher in the sidebar.
12. Cannot delete workspace with other members without removing them first.
13. Ownership transfer MUST atomically swap roles (previous owner becomes admin).
14. All API routes currently scoped by userId MUST be updated to scope by workspaceId.

## Scenarios

### Scenario 1 — Create workspace

```
Given alice@example.com is authenticated
When POST /api/workspaces with { name: "Acme AI Team" }
Then workspaces row created with ownerId=alice; workspace_members row with role=owner; 201.
```

### Scenario 2 — Invite member

```
Given alice is owner of ws-001
When POST /api/workspaces/ws-001/invite with { email: "bob@example.com", role: "member" }
Then workspace_invitations row created with expiresAt = now + 7d; bob sees notification on next login.
```

### Scenario 3 — Accept invitation

```
Given bob has pending invitation to ws-001
When POST /api/workspaces/invitations/[inviteId]/accept
Then workspace_members row created for bob with role=member; invitation acceptedAt set.
```

### Scenario 4 — Viewer cannot write

```
Given carol is viewer in ws-001
When carol calls POST /api/conversations (workspace context = ws-001)
Then 403 { error: "Insufficient permissions" }.
```

### Scenario 5 — Workspace switcher

```
Given user belongs to ws-personal and ws-acme
When user selects ws-acme in sidebar
Then active workspace updated; all subsequent requests scoped to ws-acme.
```

### Scenario 6 — Migration

```
Given alice has 10 conversations, 3 agents, 5 documents
When migration runs
Then "Personal" workspace created; all alice's rows get workspaceId = ws-alice-personal.
```

### Scenario 7 — Expired invitation

```
Given invitation created 8 days ago, not accepted
When POST accept
Then 410 Gone { error: "Invitation expired" }.
```

## Data Model

### workspaces

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | TEXT | NOT NULL |
| owner_id | TEXT | NOT NULL (email) |
| plan | TEXT | DEFAULT 'free' |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### workspace_members

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK -> workspaces(id) CASCADE |
| user_id | TEXT | NOT NULL (email) |
| role | TEXT | DEFAULT 'member' |
| joined_at | TIMESTAMP | DEFAULT NOW() |
| | | UNIQUE(workspace_id, user_id) |

### workspace_invitations

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK -> workspaces(id) CASCADE |
| inviter_id | TEXT | NOT NULL |
| invitee_email | TEXT | NOT NULL |
| role | TEXT | DEFAULT 'member' |
| token | TEXT | NOT NULL, UNIQUE |
| expires_at | TIMESTAMP | NOT NULL |
| accepted_at | TIMESTAMP | nullable |
| created_at | TIMESTAMP | DEFAULT NOW() |

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PK (email) |
| active_workspace_id | UUID | FK -> workspaces(id) |
| created_at | TIMESTAMP | DEFAULT NOW() |

### Modified tables

- `conversations` — ADD `workspace_id UUID FK -> workspaces(id)`
- `agents` — ADD `workspace_id UUID FK -> workspaces(id)`
- `documents` — ADD `workspace_id UUID FK -> workspaces(id)`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/workspaces | required | List user's workspaces |
| POST | /api/workspaces | required | Create workspace |
| GET | /api/workspaces/[wsId] | required | Get detail |
| PATCH | /api/workspaces/[wsId] | owner/admin | Update |
| DELETE | /api/workspaces/[wsId] | owner | Delete |
| GET | /api/workspaces/[wsId]/members | required | List members |
| POST | /api/workspaces/[wsId]/invite | owner/admin | Invite |
| PATCH | /api/workspaces/[wsId]/members/[userId] | owner/admin | Change role |
| DELETE | /api/workspaces/[wsId]/members/[userId] | owner/admin | Remove |
| POST | /api/workspaces/invitations/[inviteId]/accept | required | Accept |
| DELETE | /api/workspaces/invitations/[inviteId] | required | Decline |
| PATCH | /api/workspaces/[wsId]/transfer | owner | Transfer ownership |
| PATCH | /api/users/me/active-workspace | required | Switch workspace |

## Key Files

### New

- `src/core/domain/entities/workspace.ts` — Workspace, WorkspaceMember, WorkspaceInvitation, Role
- `src/core/ports/out/workspace-store.port.ts`
- `src/core/usecases/workspace.usecase.ts`
- `src/adapters/db/workspace-store.adapter.ts`
- `src/app/api/workspaces/` — 8+ route files
- `src/app/api/users/me/active-workspace/route.ts`
- `src/components/workspace/workspace-switcher.tsx`
- `src/components/workspace/members-page.tsx`
- `src/components/workspace/invite-modal.tsx`
- `src/lib/workspace-context.ts`
- `scripts/migrate-workspaces.ts`

### Modified

- `src/adapters/db/schema.ts` — add 4 tables + ALTER 3 existing
- `src/config/container.ts` — wire workspaceUseCase
- ALL API routes — re-scope from userId to workspaceId
- ALL usecases — accept workspaceId parameter
- Sidebar — add workspace switcher
