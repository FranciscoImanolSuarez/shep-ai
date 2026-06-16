'use client'

import { memo } from 'react'
import type { ReactNode } from 'react'
import { CopyIcon, SparklesIcon } from 'lucide-react'
import { parseProvider, PROVIDER_DOT } from '@/lib/model-provider'

type Role = 'user' | 'assistant' | 'system'

interface MessageBubbleProps {
  role: Role
  content: ReactNode
  timestamp?: string
  tokens?: number
  model?: string
  onCopy?: () => void
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  timestamp,
  tokens,
  model,
  onCopy,
}: MessageBubbleProps) {
  if (role === 'system') {
    return (
      <div className="flex justify-center my-6">
        <div className="max-w-lg text-center">
          <p className="text-xs text-muted-foreground italic leading-relaxed">{content}</p>
        </div>
      </div>
    )
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end my-5 group">
        <div className="max-w-[80%] sm:max-w-[70%] flex flex-col items-end">
          <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 shadow-sm">
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{content}</div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {timestamp && (
              <span className="text-[10px] text-muted-foreground font-mono">{timestamp}</span>
            )}
            {onCopy && (
              <button
                onClick={onCopy}
                aria-label="Copy message"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <CopyIcon className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // assistant — left-aligned bubble with avatar, mirroring the user side
  const parsed = parseProvider(model)
  return (
    <div className="flex justify-start gap-3 my-5 group">
      <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
        <SparklesIcon className="size-3.5 text-primary" strokeWidth={2} />
      </div>
      <div className="max-w-[85%] sm:max-w-[78%] min-w-0 flex flex-col items-start">
        <div className="rounded-2xl rounded-tl-md bg-muted/60 dark:bg-muted/40 border border-border/60 px-4 py-2.5 overflow-hidden w-fit max-w-full">
          <div className="text-[15px] leading-relaxed prose-message">{content}</div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 pl-1 w-full">
          {timestamp && (
            <span className="text-[10px] text-muted-foreground font-mono">{timestamp}</span>
          )}
          {parsed && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span className={`size-1.5 rounded-full ${PROVIDER_DOT[parsed.provider]}`} />
              <span>{parsed.provider}</span>
              <span className="opacity-50">/</span>
              <span>{parsed.name}</span>
            </span>
          )}
          {tokens != null && (
            <span className="text-[10px] text-muted-foreground font-mono">{tokens.toLocaleString()} tokens</span>
          )}
          {onCopy && (
            <button
              onClick={onCopy}
              aria-label="Copy message"
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100"
            >
              <CopyIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
