# Export Conversations

## Proposal

Users can export conversations in multiple formats for documentation, sharing, or archiving. Three formats are supported — Markdown, PDF, and JSON — for both single and batch exports. PDF is generated server-side. Zero new domain state required.

## Requirements

1. The system MUST support exporting a single conversation via `GET /api/conversations/[id]/export?format=md|pdf|json`.
2. The system MUST support batch export via `POST /api/conversations/export/batch` with `{ ids, format }`.
3. The system MUST verify conversation ownership before returning data; mismatch returns 403.
4. Exported content MUST include: title, model used, useRag flag, all messages with role/content/timestamp, RAG sources when applicable.
5. PDF exports MUST be generated server-side as `application/pdf` with `Content-Disposition: attachment`.
6. Markdown exports MUST be returned as `text/markdown` with UTF-8 encoding.
7. JSON exports MUST return raw `{ conversation, messages }` as `application/json`.
8. The UI MUST provide an export button in the chat header with format selector.
9. Batch export SHOULD download as a ZIP archive.
10. Unsupported format MUST return 400.

## Scenarios

### Scenario 1 — Single Markdown export

```
Given authenticated user owns conv-123
When GET /api/conversations/conv-123/export?format=md
Then 200, Content-Type: text/markdown, body has title heading + messages with timestamps.
```

### Scenario 2 — Single PDF export

```
Given user owns conv-456 with useRag=true
When GET /api/conversations/conv-456/export?format=pdf
Then 200, Content-Type: application/pdf, Content-Disposition: attachment, PDF includes RAG sources.
```

### Scenario 3 — Unauthorized export

```
Given conv-789 belongs to user-B
When user-A calls GET /api/conversations/conv-789/export?format=json
Then 403 Forbidden.
```

### Scenario 4 — Batch export

```
Given user owns [conv-1, conv-2, conv-3]
When POST /api/conversations/export/batch with { ids: [...], format: "md" }
Then 200, Content-Type: application/zip, ZIP contains conv-1.md, conv-2.md, conv-3.md.
```

### Scenario 5 — Invalid format

```
When GET /api/conversations/conv-123/export?format=docx
Then 400 { error: "Unsupported format. Use md, pdf, or json." }
```

## Data Model

No new tables. Uses existing `conversations` + `messages`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/conversations/[id]/export | Single export; ?format=md\|pdf\|json |
| POST | /api/conversations/export/batch | Batch export; body { ids, format } |

## Key Files

### New

- `src/app/api/conversations/[id]/export/route.ts`
- `src/app/api/conversations/export/batch/route.ts`
- `src/core/usecases/export.usecase.ts`
- `src/core/ports/out/exporter.port.ts` — IExporter interface
- `src/adapters/export/markdown.adapter.ts`
- `src/adapters/export/pdf.adapter.ts` — jspdf server-side
- `src/adapters/export/json.adapter.ts`
- `src/components/chat/export-button.tsx`

### Modified

- `src/config/container.ts` — register exporters
