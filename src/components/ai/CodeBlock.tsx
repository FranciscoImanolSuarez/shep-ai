'use client'

import { useState } from 'react'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split('\n')

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-[oklch(0.15_0_0)] dark:bg-[oklch(0.12_0_0)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs font-mono text-white/50">
          {filename ?? 'code'}
        </span>
        <div className="flex items-center gap-2">
          {language && (
            <Badge variant="default" className="bg-white/10 text-white/60 border-white/10 text-[9px]">
              {language}
            </Badge>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
            aria-label="Copy code"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-green-400" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-4">
        <code className="text-xs font-mono text-white/85 leading-relaxed">
          {lines.map((line, i) => (
            <span key={i} className="flex gap-4">
              <span className="w-5 shrink-0 text-right text-white/25 select-none tabular-nums">
                {i + 1}
              </span>
              <span>{line}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
