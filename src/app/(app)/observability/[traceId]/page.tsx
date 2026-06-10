'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ActivityIcon, ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { TraceTimeline } from '@/components/observability/TraceTimeline'
import { SpanTree } from '@/components/observability/SpanTree'
import type { Trace, TraceStatus } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'
import { Tabs } from '@/components/shared/Tabs'

function StatusBadge({ status }: { status: TraceStatus }) {
  const map: Record<TraceStatus, string> = {
    running: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  )
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatCost(cost: string): string {
  const num = parseFloat(cost)
  if (num === 0) return '$0.00'
  if (num < 0.01) return `$${num.toFixed(4)}`
  return `$${num.toFixed(2)}`
}

type View = 'timeline' | 'tree'

export default function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>()
  const [trace, setTrace] = useState<Trace | null>(null)
  const [spans, setSpans] = useState<Span[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('timeline')

  useEffect(() => {
    if (!traceId) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/observability/traces/${traceId}`)
        if (res.status === 404) {
          setError('Trace not found')
          return
        }
        if (!res.ok) throw new Error(`Failed to load trace: ${res.status}`)
        const data = await res.json()
        setTrace(data.trace)
        setSpans(data.spans)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trace')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [traceId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading trace…
      </div>
    )
  }

  if (error || !trace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <ActivityIcon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error ?? 'Trace not found'}</p>
        <Link href="/observability" className="text-sm text-primary hover:underline">
          Back to traces
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/observability"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeftIcon className="size-3.5" />
            Observability
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-mono text-sm font-semibold">{trace.id}</h1>
              <StatusBadge status={trace.status} />
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                trace.rootKind === 'agent'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {trace.rootKind}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Started {new Date(trace.startedAt).toLocaleString()}
            </p>
          </div>

          {/* Metrics */}
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">{formatDuration(trace.durationMs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total tokens</p>
              <p className="text-sm font-medium">
                {(trace.totalInputTokens + trace.totalOutputTokens).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost</p>
              <p className="text-sm font-medium">{formatCost(trace.totalCostUsd)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spans</p>
              <p className="text-sm font-medium">{trace.spanCount}</p>
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="mt-4">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as View)}
            items={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'tree', label: 'Span tree' },
            ]}
          />
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        <Tabs.Content value="timeline" current={view}>
          <TraceTimeline trace={trace} spans={spans} />
        </Tabs.Content>
        <Tabs.Content value="tree" current={view}>
          <SpanTree spans={spans} />
        </Tabs.Content>
      </div>
    </div>
  )
}
