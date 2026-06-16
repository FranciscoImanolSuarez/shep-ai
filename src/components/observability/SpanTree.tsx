'use client'

import { useState, useMemo } from 'react'
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import type { Span } from '@/core/domain/entities/span'
import type { SpanKind } from '@/core/domain/entities/trace'
import { SpanDetail } from './SpanDetail'

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

interface SpanNode {
  span: Span
  children: SpanNode[]
}

function buildTree(spans: Span[]): SpanNode[] {
  const nodeMap = new Map<string, SpanNode>()
  const roots: SpanNode[] = []

  for (const span of spans) {
    nodeMap.set(span.id, { span, children: [] })
  }

  for (const span of spans) {
    const node = nodeMap.get(span.id)!
    if (span.parentSpanId && nodeMap.has(span.parentSpanId)) {
      nodeMap.get(span.parentSpanId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

interface SpanRowProps {
  node: SpanNode
  depth: number
  selectedSpanId: string | null
  onSelect: (span: Span) => void
}

function SpanRow({ node, depth, selectedSpanId, onSelect }: SpanRowProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { span, children } = node
  const hasChildren = children.length > 0

  return (
    <>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 rounded cursor-pointer hover:bg-muted/50 transition-colors ${
          selectedSpanId === span.id ? 'bg-muted' : ''
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(span)}
      >
        {/* Expand/collapse toggle */}
        <div className="size-4 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed(!collapsed)
              }}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              className="text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
            </button>
          ) : (
            <span className="size-1 rounded-full bg-border" />
          )}
        </div>

        {/* Status icon */}
        <div className="shrink-0">
          {span.status === 'ok' ? (
            <CheckCircleIcon className="size-3.5 text-green-500" />
          ) : (
            <AlertCircleIcon className="size-3.5 text-red-500" />
          )}
        </div>

        {/* Name */}
        <span className="text-sm flex-1 truncate">{span.name}</span>

        {/* Kind badge */}
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${KIND_LABEL_COLORS[span.kind]}`}>
          {span.kind}
        </span>

        {/* Duration */}
        <span className="text-xs text-muted-foreground font-mono shrink-0 w-16 text-right">
          {formatDuration(span.durationMs)}
        </span>
      </div>

      {!collapsed && children.map((child) => (
        <SpanRow
          key={child.span.id}
          node={child}
          depth={depth + 1}
          selectedSpanId={selectedSpanId}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}

interface SpanTreeProps {
  spans: Span[]
}

export function SpanTree({ spans }: SpanTreeProps) {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)
  const tree = useMemo(() => buildTree(spans), [spans])

  return (
    <div className="flex h-full">
      {/* Tree area */}
      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No spans recorded for this trace.
          </div>
        ) : (
          <div className="py-2">
            {tree.map((node) => (
              <SpanRow
                key={node.span.id}
                node={node}
                depth={0}
                selectedSpanId={selectedSpan?.id ?? null}
                onSelect={(span) => setSelectedSpan(span === selectedSpan ? null : span)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedSpan && (
        <SpanDetail span={selectedSpan} onClose={() => setSelectedSpan(null)} />
      )}
    </div>
  )
}
