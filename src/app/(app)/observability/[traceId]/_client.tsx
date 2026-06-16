'use client'

import { useState } from 'react'
import { ActivityIcon, ChevronLeftIcon, ClockIcon, DollarSignIcon, HashIcon, ZapIcon } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Trace, TraceStatus } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'
import { Tabs } from '@/components/shared/Tabs'
import { Badge } from '@/components/shared/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDurationMs, formatCost } from '@/lib/format'

const TraceTimeline = dynamic(
  () => import('@/components/observability/TraceTimeline').then((m) => m.TraceTimeline),
  { ssr: false },
)
const SpanTree = dynamic(
  () => import('@/components/observability/SpanTree').then((m) => m.SpanTree),
  { ssr: false },
)

function StatusBadge({ status }: { status: TraceStatus }) {
  const variantMap: Record<TraceStatus, 'warning' | 'success' | 'danger'> = {
    running: 'warning',
    ok: 'success',
    error: 'danger',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

type View = 'timeline' | 'tree'

interface Props {
  initialTrace: Trace
  initialSpans: Span[]
}

export function TraceDetailClient({ initialTrace, initialSpans }: Props) {
  const trace = initialTrace
  const spans = initialSpans
  const [view, setView] = useState<View>('timeline')

  if (!trace) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={ActivityIcon}
          title="Trace not found"
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
            value={formatDurationMs(trace.durationMs)}
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
