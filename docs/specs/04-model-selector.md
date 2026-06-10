# Model Selector in Chat

## Proposal

Allow users to switch the AI model mid-conversation via a dropdown in the chat input area. A new `/api/models` endpoint returns available models filtered by which API keys are configured. The selection is persisted on the conversation record and used for subsequent messages.

## Requirements

1. The system MUST expose `GET /api/models` returning available models grouped by provider.
2. `/api/models` MUST only include providers whose keys are present in env.
3. Each model entry MUST include: id, name (display), provider, contextWindow, isDefault.
4. The chat input area MUST render a model selector dropdown showing the currently active model.
5. The selector MUST NOT block the message input field.
6. When the user selects a model, the UI MUST optimistically update the displayed model name.
7. The model change MUST be persisted via `PATCH /api/conversations/:id { model }`.
8. Subsequent messages MUST use the newly selected model.
9. If no model is selected, the server MUST fall back to `PROVIDER_DEFAULTS[AI_PROVIDER]`.
10. The selector SHOULD group models by provider with a visual separator.
11. Cross-provider switching SHOULD be allowed when multiple provider keys are configured.
12. The server MUST validate that the selected model is compatible with the active provider.
13. The model field on conversations MUST remain a plain text column (no FK).

## Scenarios

### Scenario 1 — Single provider

```
Given only OPENAI_API_KEY is set
When GET /api/models
Then OpenAI models only, no Anthropic group.
```

### Scenario 2 — Multiple providers

```
Given both OPENAI_API_KEY and ANTHROPIC_API_KEY set
When GET /api/models
Then both groups returned.
```

### Scenario 3 — Switch model mid-conversation

```
Given conversation using gpt-4o
When user selects claude-sonnet-4-20250514
Then PATCH /api/conversations/:id succeeds, next message uses Anthropic.
```

### Scenario 4 — Default model fallback

```
Given conversation with model = ""
When POST /api/chat
Then server resolves via PROVIDER_DEFAULTS[AI_PROVIDER].
```

### Scenario 5 — Invalid model rejected

```
Given AI_PROVIDER = "openai"
When PATCH with { model: "llama3.1" }
Then 422 { error: "model not valid for provider openai" }.
```

### Scenario 6 — Persist across refresh

```
Given conversation model = "gpt-4o-mini"
When page refreshed
Then selector shows "gpt-4o-mini".
```

## Data Model

No new tables. Uses existing `conversations.model` (text column).

### Model Registry (static, in codebase)

```typescript
// src/config/models.ts
export const MODEL_REGISTRY: ModelEntry[] = [
  { id: 'gpt-4o',        name: 'GPT-4o',           provider: 'openai',    contextWindow: 128000, isDefault: true  },
  { id: 'gpt-4o-mini',   name: 'GPT-4o Mini',      provider: 'openai',    contextWindow: 128000, isDefault: false },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000, isDefault: true },
  { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', provider: 'anthropic', contextWindow: 200000, isDefault: false },
  { id: 'llama3.1',      name: 'Llama 3.1',        provider: 'ollama',    contextWindow: 131072, isDefault: true  },
]
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/models | Available models filtered by configured API keys |
| PATCH | /api/conversations/:id | Update model (already exists, add validation) |

## Key Files

### New

- `src/config/models.ts` — MODEL_REGISTRY
- `src/app/api/models/route.ts` — GET handler
- `src/components/chat/ModelSelector.tsx` — dropdown component

### Modified

- `src/app/api/conversations/[id]/route.ts` — validate model on PATCH
- `src/components/chat/chat-interface.tsx` — embed ModelSelector
