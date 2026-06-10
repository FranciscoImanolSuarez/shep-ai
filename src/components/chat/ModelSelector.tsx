'use client'

import { useState, useEffect } from 'react'
import {
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectValue,
} from '@/components/ai-elements/prompt-input'
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from '@/components/ui/select'
import type { ModelEntry } from '@/config/models'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderGroup {
  id: string
  name: string
  models: ModelEntry[]
}

interface ModelsResponse {
  providers: ProviderGroup[]
}

// ---------------------------------------------------------------------------
// Context-window badge helper
// ---------------------------------------------------------------------------

function formatContextWindow(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ModelSelectorProps {
  value: string | undefined
  onChange: (modelId: string) => void
  disabled?: boolean
}

// Simple module-level cache so we only fetch once per page session.
let _cachedProviders: ProviderGroup[] | null = null

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [providers, setProviders] = useState<ProviderGroup[]>(_cachedProviders ?? [])
  const [loading, setLoading] = useState(_cachedProviders === null)

  useEffect(() => {
    if (_cachedProviders !== null) return

    let cancelled = false
    setLoading(true)
    fetch('/api/models')
      .then((r) => r.json())
      .then((data: ModelsResponse) => {
        if (cancelled) return
        _cachedProviders = data.providers ?? []
        setProviders(_cachedProviders)
      })
      .catch(() => {
        if (!cancelled) setProviders([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // Resolve a display name for the trigger from either the registry or the raw id.
  const allModels = providers.flatMap((p) => p.models)
  const selectedEntry = allModels.find((m) => m.id === value)
  const triggerLabel = selectedEntry?.name ?? value ?? (loading ? 'Loading…' : 'Select model')

  return (
    <PromptInputSelect
      value={value ?? null}
      onValueChange={(v) => { if (v) onChange(v as string) }}
      disabled={disabled || loading}
    >
      <PromptInputSelectTrigger
        size="sm"
        className="h-auto border-none bg-transparent px-1.5 py-0.5 text-xs font-medium text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
        aria-label="Select AI model"
      >
        <PromptInputSelectValue placeholder={triggerLabel}>
          {triggerLabel}
        </PromptInputSelectValue>
      </PromptInputSelectTrigger>

      <PromptInputSelectContent align="start" side="top" className="min-w-[220px]">
        {providers.map((provider, idx) => (
          <SelectGroup key={provider.id}>
            {idx > 0 && <SelectSeparator />}
            <SelectLabel className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {provider.name}
            </SelectLabel>
            {provider.models.map((model) => (
              <SelectItem key={model.id} value={model.id} className="pr-3">
                <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] leading-snug truncate">{model.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{model.id}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {formatContextWindow(model.contextWindow)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
