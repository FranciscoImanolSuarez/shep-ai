'use client'

import { useState } from 'react'
import { ChevronRightIcon } from 'lucide-react'

interface JSONViewerProps {
  data: unknown
  maxDepth?: number
  collapsed?: boolean
}

interface NodeProps {
  data: unknown
  depth: number
  maxDepth: number
  collapsed: boolean
}

function JSONNode({ data, depth, maxDepth, collapsed }: NodeProps) {
  const [isOpen, setIsOpen] = useState(!collapsed && depth < maxDepth)

  if (data === null) {
    return <span className="text-[oklch(0.6_0_0)] dark:text-[oklch(0.65_0_0)]">null</span>
  }

  if (typeof data === 'boolean') {
    return (
      <span className="text-violet-500 dark:text-violet-400">{data ? 'true' : 'false'}</span>
    )
  }

  if (typeof data === 'number') {
    return <span className="text-amber-500 dark:text-amber-400">{data}</span>
  }

  if (typeof data === 'string') {
    return <span className="text-green-600 dark:text-green-400">"{data}"</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>
    return (
      <span>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center gap-0.5 hover:opacity-70 transition-opacity"
        >
          <ChevronRightIcon
            className={`size-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
          <span className="text-muted-foreground text-xs">
            [{data.length}]
          </span>
        </button>
        {isOpen && (
          <span className="block pl-4">
            {data.map((item, i) => (
              <span key={i} className="block">
                <span className="text-muted-foreground text-xs">{i}: </span>
                <JSONNode data={item} depth={depth + 1} maxDepth={maxDepth} collapsed={collapsed} />
                {i < data.length - 1 && <span className="text-muted-foreground">,</span>}
              </span>
            ))}
          </span>
        )}
      </span>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-muted-foreground">{'{}'}</span>
    return (
      <span>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center gap-0.5 hover:opacity-70 transition-opacity"
        >
          <ChevronRightIcon
            className={`size-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
          <span className="text-muted-foreground text-xs">
            {'{'}
            {entries.length}
            {'}'}
          </span>
        </button>
        {isOpen && (
          <span className="block pl-4">
            {entries.map(([key, value], i) => (
              <span key={key} className="block">
                <span className="text-blue-500 dark:text-blue-400">"{key}"</span>
                <span className="text-muted-foreground">: </span>
                <JSONNode
                  data={value}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  collapsed={collapsed}
                />
                {i < entries.length - 1 && <span className="text-muted-foreground">,</span>}
              </span>
            ))}
          </span>
        )}
      </span>
    )
  }

  return <span className="text-muted-foreground">{String(data)}</span>
}

export function JSONViewer({ data, maxDepth = 4, collapsed = false }: JSONViewerProps) {
  return (
    <pre className="text-xs font-mono leading-relaxed overflow-auto">
      <JSONNode data={data} depth={0} maxDepth={maxDepth} collapsed={collapsed} />
    </pre>
  )
}
