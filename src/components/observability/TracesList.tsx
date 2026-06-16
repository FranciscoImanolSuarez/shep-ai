'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ActivityIcon, ArrowRightIcon } from 'lucide-react'
import type { Trace, TraceStatus } from '@/core/domain/entities/trace'
import { Badge } from '@/components/shared/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateRangePicker } from '@/components/shared/forms/DateRangePicker'
import { formatDurationMs, formatCost } from '@/lib/format'

function StatusBadge({ status }: { status: TraceStatus }) {
  const variantMap: Record<TraceStatus, 'warning' | 'success' | 'danger'> = {
    running: 'warning',
    ok: 'success',
    error: 'danger',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

function KindBadge({ kind }: { kind: 'agent' | 'workflow' }) {
  const variantMap: Record<string, 'info' | 'warning'> = {
    agent: 'info',
    workflow: 'warning',
  }
  return <Badge variant={variantMap[kind] ?? 'default'}>{kind}</Badge>
}

interface Filters {
  status: '' | TraceStatus
  kind: '' | 'agent' | 'workflow'
  startedAfter: string
  startedBefore: string
}

export function TracesList() {
  const [traces, setTraces] = useState<Trace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    status: '',
    kind: '',
    startedAfter: '',
    startedBefore: '',
  })

  const fetchTraces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/observability/traces', window.location.origin)
      if (filters.status) url.searchParams.set('status', filters.status)
      if (filters.startedAfter) url.searchParams.set('startedAfter', filters.startedAfter)
      if (filters.startedBefore) url.searchParams.set('startedBefore', filters.startedBefore)
      url.searchParams.set('limit', '50')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Failed to fetch traces: ${res.status}`)
      const data = await res.json()
      setTraces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traces')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTraces()
  }, [fetchTraces])

  const filteredTraces = filters.kind
    ? traces.filter((t) => t.rootKind === filters.kind)
    : traces

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status filter chips */}
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {(['', 'ok', 'error', 'running'] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilters((f) => ({ ...f, status: s }))}
              aria-pressed={filters.status === s}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filters.status === s
                  ? 'bg-foreground text-background border-transparent'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              {s || 'All status'}
            </button>
          ))}
        </div>

        {/* Kind filter chips */}
        <div className="flex gap-1" role="group" aria-label="Filter by kind">
          {(['', 'agent', 'workflow'] as const).map((k) => (
            <button
              key={k || 'all'}
              onClick={() => setFilters((f) => ({ ...f, kind: k }))}
              aria-pressed={filters.kind === k}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filters.kind === k
                  ? 'bg-foreground text-background border-transparent'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              {k || 'All kinds'}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="ml-auto">
          <DateRangePicker
            from={filters.startedAfter}
            to={filters.startedBefore}
            onChange={({ from, to }) =>
              setFilters((f) => ({ ...f, startedAfter: from, startedBefore: to }))
            }
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TracesListSkeleton />
      ) : error ? (
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">
          {error}
        </div>
      ) : filteredTraces.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No traces yet"
          description="Traces appear here every time an agent or workflow runs. Each trace shows a tree of spans with timing, tokens, and cost."
          action={
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium shadow-sm hover:bg-foreground/90 transition-colors"
            >
              Run an agent
              <ArrowRightIcon className="size-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Trace ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Kind</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tokens</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Cost</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Spans</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTraces.map((trace) => (
                <tr
                  key={trace.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/observability/${trace.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {trace.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <KindBadge kind={trace.rootKind} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDurationMs(trace.durationMs)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {(trace.totalInputTokens + trace.totalOutputTokens).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatCost(trace.totalCostUsd)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {trace.spanCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(trace.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TracesListSkeleton() {
  const columnWidths = ['w-16', 'w-14', 'w-12', 'w-12', 'w-14', 'w-12', 'w-8', 'w-32']
  return (
    <div
      className="rounded-lg border border-border overflow-hidden animate-pulse"
      aria-busy="true"
      aria-label="Loading traces"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {['Trace ID', 'Kind', 'Status', 'Duration', 'Tokens', 'Cost', 'Spans', 'Started'].map((label) => (
              <th key={label} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {columnWidths.map((w, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <div className={`h-3 ${w} rounded bg-muted`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
