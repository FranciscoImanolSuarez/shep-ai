'use client'

import { useState } from 'react'
import type { Trace } from '@/core/domain/entities/trace'
import type { Span } from '@/core/domain/entities/span'
import type { SpanKind } from '@/core/domain/entities/trace'
import { SpanDetail } from './SpanDetail'

const KIND_COLORS: Record<SpanKind, string> = {
  agent: 'bg-blue-500',
  llm: 'bg-purple-500',
  tool: 'bg-green-500',
  workflow: 'bg-orange-500',
  workflow_node: 'bg-amber-500',
}

function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function buildTicks(durationMs: number, count = 5): number[] {
  const ticks: number[] = []
  for (let i = 0; i <= count; i++) {
    ticks.push((durationMs * i) / count)
  }
  return ticks
}

interface TraceTimelineProps {
  trace: Trace
  spans: Span[]
}

export function TraceTimeline({ trace, spans }: TraceTimelineProps) {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)

  const traceStartMs = new Date(trace.startedAt).getTime()
  const traceDurationMs = Math.max(trace.durationMs ?? 1, 1)
  const ticks = buildTicks(traceDurationMs)

  return (
    <div className="flex h-full">
      {/* Timeline area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        {/* Time axis header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-stretch px-4">
            {/* Label column spacer */}
            <div className="w-48 shrink-0 py-2 text-xs text-muted-foreground font-medium">
              Spans
            </div>
            {/* Tick marks area */}
            <div className="flex-1 relative py-2">
              {ticks.map((ms, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col items-start"
                  style={{ left: `${(i / (ticks.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap px-1">
                    {formatDuration(ms)}
                  </span>
                </div>
              ))}
            </div>
            {/* Duration column spacer */}
            <div className="w-16 shrink-0" />
          </div>
        </div>

        {/* Span rows */}
        <div className="px-4 py-2 space-y-1">
          {spans.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No spans recorded for this trace.
            </div>
          ) : (
            spans.map((span) => {
              const spanStartMs = new Date(span.startedAt).getTime()
              const offsetMs = spanStartMs - traceStartMs
              const left = Math.max(0, (offsetMs / traceDurationMs) * 100)
              const width = Math.max(0.5, (span.durationMs / traceDurationMs) * 100)
              const isSelected = selectedSpan?.id === span.id

              return (
                <div key={span.id} className="flex items-center gap-2 h-7">
                  {/* Span name */}
                  <div className="w-48 shrink-0 text-xs text-muted-foreground truncate text-right pr-2">
                    {span.name}
                  </div>

                  {/* Bar area with gridlines */}
                  <div className="flex-1 relative h-5">
                    {/* Gridlines */}
                    {ticks.map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-border/50"
                        style={{ left: `${(i / (ticks.length - 1)) * 100}%` }}
                      />
                    ))}
                    {/* Bar */}
                    <button
                      onClick={() => setSelectedSpan(isSelected ? null : span)}
                      aria-label={`${span.name}, ${formatDuration(span.durationMs)}, ${span.status}`}
                      aria-pressed={isSelected}
                      className={`absolute h-5 rounded cursor-pointer transition-opacity hover:opacity-80 ${KIND_COLORS[span.kind]} ${
                        isSelected ? 'ring-2 ring-offset-1 ring-foreground' : ''
                      } ${span.status === 'error' ? 'ring-1 ring-red-400' : ''}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: '4px',
                      }}
                      title={`${span.name} — ${formatDuration(span.durationMs)}`}
                    />
                  </div>

                  {/* Duration */}
                  <div className="w-16 shrink-0 text-xs text-muted-foreground font-mono text-right">
                    {formatDuration(span.durationMs)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedSpan && (
        <SpanDetail span={selectedSpan} onClose={() => setSelectedSpan(null)} />
      )}
    </div>
  )
}
