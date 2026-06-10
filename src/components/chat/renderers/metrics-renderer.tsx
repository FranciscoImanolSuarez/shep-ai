'use client'

import { useMemo } from 'react'
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react'

interface MetricsRendererProps {
  code: string
  isIncomplete: boolean
  language: string
}

interface MetricItem {
  label: string
  value: string | number
  change?: number       // percentage change (e.g. +12.5 or -3.2)
  prefix?: string       // e.g. "$", "€"
  suffix?: string       // e.g. "%", "ms", "users"
  description?: string
}

interface MetricsData {
  title?: string
  metrics: MetricItem[]
}

function TrendBadge({ change }: { change: number }) {
  const isPositive = change > 0
  const isNeutral = change === 0
  const Icon = isPositive ? TrendingUpIcon : isNeutral ? MinusIcon : TrendingDownIcon

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isPositive ? 'text-emerald-600' : isNeutral ? 'text-muted-foreground' : 'text-red-500'
    }`}>
      <Icon className="size-3" />
      {isPositive ? '+' : ''}{change}%
    </span>
  )
}

export function MetricsRenderer({ code, isIncomplete }: MetricsRendererProps) {
  const data = useMemo<MetricsData | null>(() => {
    try {
      const parsed = JSON.parse(code)
      // Support both { metrics: [...] } and direct array [...]
      if (Array.isArray(parsed)) return { metrics: parsed }
      return parsed as MetricsData
    } catch {
      return null
    }
  }, [code])

  if (isIncomplete) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          Loading metrics...
        </div>
      </div>
    )
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Invalid metrics data. Expected JSON with metrics[].label and metrics[].value.
      </div>
    )
  }

  const cols = data.metrics.length <= 2 ? data.metrics.length
    : data.metrics.length === 3 ? 3
    : data.metrics.length === 4 ? 4
    : 3

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {data.title && (
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
        </div>
      )}

      <div className={`grid gap-px bg-border`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {data.metrics.map((metric, i) => (
          <div key={i} className="bg-card p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {metric.label}
              </p>
              {metric.change !== undefined && <TrendBadge change={metric.change} />}
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {metric.prefix}{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}{metric.suffix}
            </p>
            {metric.description && (
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
