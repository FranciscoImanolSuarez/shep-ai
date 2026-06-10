'use client'

import { XIcon } from 'lucide-react'
import type { Span } from '@/core/domain/entities/span'
import type { SpanKind } from '@/core/domain/entities/trace'
import { JSONViewer } from '@/components/shared/JSONViewer'
import { KeyValueGrid } from '@/components/shared/KeyValueGrid'

const KIND_LABEL_COLORS: Record<SpanKind, string> = {
  agent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  llm: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  tool: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  workflow: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  workflow_node: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatEventTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  } catch {
    return iso
  }
}

interface SpanDetailProps {
  span: Span
  onClose: () => void
}

export function SpanDetail({ span, onClose }: SpanDetailProps) {
  return (
    <div className="w-80 border-l border-border bg-background p-4 overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm truncate flex-1">{span.name}</h3>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className="ml-2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex gap-2">
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_LABEL_COLORS[span.kind]}`}>
            {span.kind}
          </span>
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
              span.status === 'ok'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {span.status}
          </span>
        </div>

        <KeyValueGrid
          columns={2}
          items={[
            { label: 'Duration', value: formatDuration(span.durationMs), mono: true },
            ...(span.inputTokens !== undefined
              ? [{ label: 'Input tokens', value: span.inputTokens.toLocaleString(), mono: true }]
              : []),
            ...(span.outputTokens !== undefined
              ? [{ label: 'Output tokens', value: span.outputTokens.toLocaleString(), mono: true }]
              : []),
            ...(span.costUsd !== undefined
              ? [{ label: 'Cost', value: `$${parseFloat(span.costUsd).toFixed(4)}`, mono: true }]
              : []),
          ]}
        />

        {span.statusMessage && (
          <div>
            <p className="text-muted-foreground mb-0.5">Status message</p>
            <p className="text-red-500 break-words">{span.statusMessage}</p>
          </div>
        )}

        {Object.keys(span.attributes).length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1">Attributes</p>
            <div className="bg-muted rounded p-2">
              <JSONViewer data={span.attributes} />
            </div>
          </div>
        )}

        {span.events.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1">Events</p>
            <div className="space-y-1">
              {span.events.map((evt, i) => (
                <div key={i} className="bg-muted rounded p-2 text-[10px] font-mono">
                  <p className="font-medium">{evt.name}</p>
                  <p className="text-muted-foreground">{formatEventTimestamp(evt.ts)}</p>
                  {evt.attrs && (
                    <div className="mt-1">
                      {Object.entries(evt.attrs).map(([k, v]) => (
                        <div key={k} className="flex gap-1">
                          <span className="text-blue-600 dark:text-blue-400">{k}:</span>
                          <span className="break-all">{JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
