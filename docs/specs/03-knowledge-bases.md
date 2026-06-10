# Multiple Knowledge Bases

## Proposal

Replace the single global document pool with named, user-owned Knowledge Bases (KBs). Each KB is an isolated vector space; RAG queries are scoped to one KB. Conversations and Agents declare which KB (if any) to search. Existing documents are migrated to a "Default" KB to preserve backward compatibility.

## Requirements

1. The system MUST allow authenticated users to create, read, update, and delete Knowledge Bases.
2. A Knowledge Base MUST have: id (UUID), userId (text), name (text, required), description (text, optional), createdAt, updatedAt.
3. The system MUST enforce that a user can only access their own Knowledge Bases.
4. Every document ingested MUST be assigned to exactly one KB via `knowledgeBaseId` FK.
5. The `documents` table MUST add a non-nullable `knowledgeBaseId` column (FK -> knowledge_bases.id, ON DELETE CASCADE).
6. A data migration MUST create a "Default" Knowledge Base and assign all orphaned documents to it.
7. `VectorStorePort.search()` MUST accept an optional `knowledgeBaseId` filter.
8. `PgVectorAdapter.search()` MUST filter by `documents.knowledge_base_id` when `knowledgeBaseId` is provided.
9. `RagUseCase.ingest()` MUST accept and forward `knowledgeBaseId`.
10. `RagUseCase.query()` MUST accept and forward `knowledgeBaseId`.
11. The `conversations` table MUST add a nullable `knowledgeBaseId` column.
12. The chat API MUST read `knowledgeBaseId` from the request body and scope vector search when `useRag` is true.
13. The Agent entity and agents table MUST support an optional `knowledgeBaseId`.
14. The `rag-search` tool MUST forward the agent's `knowledgeBaseId` to `RagPort.query()`.
15. The system SHOULD surface a documentCount on KB list responses.
16. All KB CRUD endpoints MUST require an authenticated session.

## Scenarios

### Scenario 1 — Create a KB

```
Given an authenticated user
When POST /api/knowledge-bases with { name: "Legal" }
Then 201 with KB record.
```

### Scenario 2 — List KBs

```
Given user with 3 KBs
When GET /api/knowledge-bases
Then only that user's 3 KBs, never other users'.
```

### Scenario 3 — Ingest into specific KB

```
Given KB "kb-legal" exists
When POST /api/rag/ingest with { content, source, knowledgeBaseId: "kb-legal" }
Then document saved with knowledgeBaseId = "kb-legal", chunks searchable only within that KB.
```

### Scenario 4 — RAG query scoped to KB

```
Given conversation with knowledgeBaseId = "kb-legal"
When POST /api/chat with { useRag: true, knowledgeBaseId: "kb-legal" }
Then vector search filters to kb-legal chunks only.
```

### Scenario 5 — Unscoped RAG (backward compatible)

```
Given conversation with knowledgeBaseId = null
When POST /api/chat with { useRag: true }
Then search queries all documents (same behavior as today).
```

### Scenario 6 — Migration

```
When migration runs
Then a "Default" KB is created and all existing documents are assigned to it.
```

### Scenario 7 — Agent with KB

```
Given agent with knowledgeBaseId = "kb-finance"
When agent calls rag-search
Then query is scoped to kb-finance.
```

### Scenario 8 — Delete a KB

```
When DELETE /api/knowledge-bases/kb-legal
Then KB deleted, all documents and chunks CASCADE deleted.
```

## Data Model

### knowledge_bases

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| user_id | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| description | TEXT | NOT NULL, DEFAULT '' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Index: `user_id`

### Modified tables

- `documents` — ADD `knowledge_base_id UUID FK -> knowledge_bases(id) CASCADE`
- `conversations` — ADD `knowledge_base_id UUID FK -> knowledge_bases(id) SET NULL`
- `agents` — ADD `knowledge_base_id UUID FK -> knowledge_bases(id) SET NULL`

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | /api/knowledge-bases | { knowledgeBases: KB[] } |
| POST | /api/knowledge-bases | 201 KB |
| GET | /api/knowledge-bases/:id | KB |
| PATCH | /api/knowledge-bases/:id | KB |
| DELETE | /api/knowledge-bases/:id | 204 |
| GET | /api/knowledge-bases/:id/documents | { documents[] } |
| POST | /api/rag/ingest | + knowledgeBaseId (required) |
| POST | /api/chat | + knowledgeBaseId? |

## Key Files

### New

- `src/core/domain/entities/knowledge-base.ts`
- `src/core/ports/in/knowledge-base.port.ts`
- `src/core/ports/out/knowledge-base-store.port.ts`
- `src/core/usecases/knowledge-base.usecase.ts`
- `src/adapters/db/knowledge-base-store.adapter.ts`
- `src/app/api/knowledge-bases/route.ts`
- `src/app/api/knowledge-bases/[id]/route.ts`
- `src/app/api/knowledge-bases/[id]/documents/route.ts`
- `src/components/knowledge-bases/KnowledgeBaseSelector.tsx`

### Modified

- `src/adapters/db/schema.ts` — add table + FKs
- `src/core/ports/out/vector-store.port.ts` — add knowledgeBaseId to search()
- `src/adapters/db/pgvector.adapter.ts` — filter by knowledgeBaseId
- `src/core/usecases/rag.usecase.ts` — forward knowledgeBaseId
- `src/app/api/chat/route.ts` — pass knowledgeBaseId to search
- `src/core/tools/builtin/rag-search.tool.ts` — forward agent's KB
- `src/config/container.ts` — wire KnowledgeBaseUseCase
