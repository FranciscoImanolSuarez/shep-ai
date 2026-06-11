'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ActivityIcon, ChevronLeftIcon, ClockIcon, DollarSignIcon, HashIcon, ZapIcon } from 'lucide-react'
import Link from 'next/link'
import { TraceTimeline } from '@/components/observability/TraceTimeline'
import { SpanTree } from '@/components/observability/SpanTree'
import type { Trace, TraceStatus } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'
import { Tabs } from '@/components/shared/Tabs'
import { Badge } from '@/components/shared/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'

function StatusBadge({ status }: { status: TraceStatus }) {
  const variantMap: Record<TraceStatus, 'warning' | 'success' | 'danger'> = {
    running: 'warning',
    ok: 'success',
    error: 'danger',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
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
      <div className="flex-1 overflow-auto">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !trace) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={ActivityIcon}
          title={error ?? 'Trace not found'}
          description="The trace you're looking for doesn't exist or could not be loaded."
          action={
            <Link
              href="/observability"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium shadow-sm hover:bg-foreground/90 transition-colors"
            >
              <ChevronLeftIcon className="size-4" />
              Back to traces
            </Link>
          }
        />
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

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-mono text-sm font-semibold">{trace.id}</h1>
              <StatusBadge status={trace.status} />
              <Badge variant={trace.rootKind === 'agent' ? 'info' : 'warning'}>
                {trace.rootKind}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Started {new Date(trace.startedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatCard
            label="Duration"
            value={formatDuration(trace.durationMs)}
            icon={ClockIcon}
          />
          <StatCard
            label="Total tokens"
            value={(trace.totalInputTokens + trace.totalOutputTokens).toLocaleString()}
            icon={ZapIcon}
          />
          <StatCard
            label="Cost"
            value={formatCost(trace.totalCostUsd)}
            icon={DollarSignIcon}
          />
          <StatCard
            label="Spans"
            value={trace.spanCount}
            icon={HashIcon}
          />
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
