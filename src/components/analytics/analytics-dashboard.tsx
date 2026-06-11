'use client'

import { useState, useCallback } from 'react'
import type { AuditAggregateResult, AuditTimeBucket } from '@/core/ports/out/audit-store.port'
import { MetricCard } from '@/components/shared/MetricCard'
import { Tabs } from '@/components/shared/Tabs'
import { SectionDivider } from '@/components/shared/SectionDivider'

type Period = '7d' | '30d' | '90d'

interface Props {
  initial: AuditAggregateResult | null
}

function periodLabel(p: Period) {
  return p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'
}

function periodDays(p: Period) {
  return p === '7d' ? 7 : p === '30d' ? 30 : 90
}

function periodGranularity(p: Period): 'day' | 'week' | 'month' {
  return p === '90d' ? 'week' : 'day'
}

function LineChart({ data }: { data: AuditTimeBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data for this period.</p>
      </div>
    )
  }

  const maxTokens = Math.max(...data.map((d) => d.tokenCount), 1)
  const W = 600
  const H = 140
  const PAD = { top: 10, right: 8, bottom: 24, left: 40 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const points = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: PAD.top + innerH - (d.tokenCount / maxTokens) * innerH,
    label: new Date(d.bucket).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    tokens: d.tokenCount,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`

  // Y-axis ticks
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    y: PAD.top + innerH - ratio * innerH,
    label: Math.round(maxTokens * ratio).toLocaleString(),
  }))

  // X-axis: show up to 6 labels
  const step = Math.max(1, Math.floor(points.length / 6))
  const xTicks = points.filter((_, i) => i % step === 0 || i === points.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t.y}
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={t.y}
          y2={t.y}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}

      {/* Y labels */}
      {yTicks.map((t) => (
        <text
          key={t.y}
          x={PAD.left - 4}
          y={t.y}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.4}
        >
          {t.label}
        </text>
      ))}

      {/* X labels */}
      {xTicks.map((p) => (
        <text
          key={p.x}
          x={p.x}
          y={H - 6}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.4}
        >
          {p.label}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="var(--primary)" fillOpacity={0.08} />

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={1.5} />

      {/* Dots */}
      {points.length < 40 &&
        points.map((p) => (
          <circle key={p.x} cx={p.x} cy={p.y} r={2} fill="var(--primary)" fillOpacity={0.9} />
        ))}
    </svg>
  )
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data for this period.</p>
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const W = 600
  const H = 140
  const PAD = { top: 10, right: 8, bottom: 24, left: 8 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barWidth = innerW / data.length
  const BAR_GAP = 0.3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
      {data.map((d, i) => {
        const bw = barWidth * (1 - BAR_GAP)
        const bx = PAD.left + i * barWidth + (barWidth - bw) / 2
        const bh = (d.value / maxVal) * innerH
        const by = PAD.top + innerH - bh

        return (
          <g key={d.label}>
            <rect x={bx} y={by} width={bw} height={bh} fill="var(--chart-1)" fillOpacity={0.7} rx={2} />
            <text
              x={bx + bw / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {d.label.replace('_', ' ')}
            </text>
            {bh > 16 && (
              <text
                x={bx + bw / 2}
                y={by + 10}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                fillOpacity={0.6}
              >
                {d.value}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  chat_message: 'Chat',
  agent_run: 'Agent run',
  rag_query: 'RAG query',
  document_upload: 'Doc upload',
  agent_delegation: 'Delegation',
}

export function AnalyticsDashboard({ initial }: Props) {
  const [data, setData] = useState<AuditAggregateResult | null>(initial)
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const now = new Date()
      const from = new Date(now.getTime() - periodDays(p) * 24 * 60 * 60 * 1000)
      const gran = periodGranularity(p)
      const res = await fetch(
        `/api/analytics?from=${from.toISOString()}&to=${now.toISOString()}&granularity=${gran}`,
      )
      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  function handlePeriodChange(p: Period) {
    setPeriod(p)
    void fetchData(p)
  }

  const summary = data?.summary
  const totalTokens = summary?.totalTokens ?? 0
  const totalCost = summary?.totalCostUsd ?? 0
  const totalEvents = Object.values(summary?.eventCounts ?? {}).reduce((a, b) => a + b, 0)
  const avgTokens = totalEvents > 0 ? (totalTokens / totalEvents).toFixed(0) : '0'

  const eventBarData = Object.entries(summary?.eventCounts ?? {}).map(([key, val]) => ({
    label: EVENT_TYPE_LABELS[key] ?? key,
    value: val,
  }))

  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      {/* Period selector */}
      <Tabs
        value={period}
        onValueChange={(v) => handlePeriodChange(v as Period)}
        items={(['7d', '30d', '90d'] as Period[]).map((p) => ({
          value: p,
          label: periodLabel(p),
        }))}
      />

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <MetricCard label="Total tokens" value={totalTokens.toLocaleString()} />
        <MetricCard label="Total cost (USD)" value={`$${totalCost.toFixed(4)}`} />
        <MetricCard label="Total events" value={totalEvents.toLocaleString()} />
        <MetricCard label="Avg tokens / event" value={avgTokens} />
      </div>

      <SectionDivider label="Charts" align="left" />

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
          <p className="text-sm font-semibold mb-3">Token usage</p>
          <LineChart data={data?.timeSeries ?? []} />
        </div>
        <div className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
          <p className="text-sm font-semibold mb-3">Events by type</p>
          <BarChart data={eventBarData} />
        </div>
      </div>

      <SectionDivider label="Top lists" align="left" />

      {/* Top lists row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top agents */}
        <div className="border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 border-b border-border bg-muted/40">
            Top agents
          </p>
          {(data?.topAgents ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No agent runs yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {data!.topAgents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                >
                  <span className="truncate max-w-[60%]">{agent.name}</span>
                  <span className="text-muted-foreground shrink-0">{agent.runCount} runs</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top documents */}
        <div className="border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 border-b border-border bg-muted/40">
            Top documents (RAG)
          </p>
          {(data?.topDocuments ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No RAG queries yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {data!.topDocuments.map((doc) => (
                <div
                  key={doc.source}
                  className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                >
                  <span className="truncate max-w-[60%]">{doc.source}</span>
                  <span className="text-muted-foreground shrink-0">{doc.queryCount} queries</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
