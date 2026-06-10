'use client'

import { useState } from 'react'
import { MaximizeIcon, MinimizeIcon, DownloadIcon } from 'lucide-react'

interface SVGRendererProps {
  code: string
  isIncomplete: boolean
  language: string
}

export function SVGRenderer({ code, isIncomplete }: SVGRendererProps) {
  const [expanded, setExpanded] = useState(false)

  if (isIncomplete) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          Rendering SVG...
        </div>
      </div>
    )
  }

  // Sanitize: only allow SVG content
  const sanitized = code.trim()
  if (!sanitized.startsWith('<svg') && !sanitized.startsWith('<?xml')) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Invalid SVG content
      </div>
    )
  }

  function handleDownload() {
    const blob = new Blob([sanitized], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chart.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`group relative rounded-xl border border-border bg-white dark:bg-card overflow-hidden transition-all ${
      expanded ? 'fixed inset-4 z-50 shadow-2xl' : ''
    }`}>
      {/* Toolbar */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? 'Minimize' : 'Expand'}
        >
          {expanded ? <MinimizeIcon className="size-3.5" /> : <MaximizeIcon className="size-3.5" />}
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Download SVG"
        >
          <DownloadIcon className="size-3.5" />
        </button>
      </div>

      {/* Backdrop for expanded mode */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* SVG Container */}
      <div
        className={`flex items-center justify-center p-6 ${expanded ? 'h-full' : 'min-h-[200px]'}`}
        dangerouslySetInnerHTML={{ __html: sanitized }}
        style={{
          // Ensure SVG fills container properly
          ['--svg-max-width' as string]: '100%',
        }}
      />
    </div>
  )
}
