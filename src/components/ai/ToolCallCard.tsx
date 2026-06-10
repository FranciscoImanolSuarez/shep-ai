'use client'

import { useState } from 'react'
import { WrenchIcon, ChevronDownIcon } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { JSONViewer } from '@/components/shared/JSONViewer'

interface ToolCallCardProps {
  name: string
  args: unknown
  result?: unknown
  status: 'running' | 'completed' | 'failed'
  durationMs?: number
  error?: string
}

export function ToolCallCard({
  name,
  args,
  result,
  status,
  durationMs,
  error,
}: ToolCallCardProps) {
  const [argsOpen, setArgsOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  const statusVariant =
    status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'warning'

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <WrenchIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-mono font-medium flex-1 min-w-0 truncate">{name}</span>
        <Badge variant={statusVariant}>{status}</Badge>
        {durationMs != null && (
          <span className="text-xs font-mono text-muted-foreground shrink-0">{durationMs}ms</span>
        )}
      </div>

      {/* Body */}
      <div className="divide-y divide-border">
        {/* Args */}
        <div>
          <button
            onClick={() => setArgsOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors text-xs font-mono text-muted-foreground"
          >
            <ChevronDownIcon
              className={`size-3.5 transition-transform ${argsOpen ? '' : '-rotate-90'}`}
            />
            <span>Arguments</span>
          </button>
          {argsOpen && (
            <div className="px-4 pb-3 pt-1">
              <JSONViewer data={args} maxDepth={4} />
            </div>
          )}
        </div>

        {/* Result or Error */}
        {status !== 'running' && (
          <div>
            <button
              onClick={() => setResultOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors text-xs font-mono text-muted-foreground"
            >
              <ChevronDownIcon
                className={`size-3.5 transition-transform ${resultOpen ? '' : '-rotate-90'}`}
              />
              <span>{status === 'failed' ? 'Error' : 'Result'}</span>
            </button>
            {resultOpen && (
              <div className="px-4 pb-3 pt-1">
                {status === 'failed' ? (
                  <p className="text-xs font-mono text-destructive">{error ?? 'Unknown error'}</p>
                ) : (
                  <JSONViewer data={result} maxDepth={4} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
