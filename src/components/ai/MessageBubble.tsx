'use client'

import type { ReactNode } from 'react'
import { CopyIcon, SparklesIcon } from 'lucide-react'

type Role = 'user' | 'assistant' | 'system'
type Provider = 'openai' | 'anthropic' | 'ollama'

interface MessageBubbleProps {
  role: Role
  content: ReactNode
  timestamp?: string
  tokens?: number
  model?: string
  onCopy?: () => void
}

function parseModel(modelString?: string): { provider: Provider; name: string } | null {
  if (!modelString) return null
  if (modelString.includes('/')) {
    const [provider, ...rest] = modelString.split('/')
    const p = provider.toLowerCase()
    if (p === 'openai' || p === 'anthropic' || p === 'ollama') {
      return { provider: p, name: rest.join('/') }
    }
  }
  // Fallback: try to detect by prefix
  if (modelString.startsWith('gpt')) return { provider: 'openai', name: modelString }
  if (modelString.startsWith('claude')) return { provider: 'anthropic', name: modelString }
  if (modelString.startsWith('llama') || modelString.startsWith('mistral')) return { provider: 'ollama', name: modelString }
  return { provider: 'openai', name: modelString }
}

const PROVIDER_DOT: Record<Provider, string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  ollama: 'bg-violet-500',
}

export function MessageBubble({
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
      <div className="flex justify-end my-8 group">
        <div className="max-w-[85%] sm:max-w-[80%]">
          <div className="rounded-2xl rounded-tr-md bg-muted/70 dark:bg-muted px-4 py-3">
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</div>
          </div>
          <div className="flex justify-end items-center gap-2 mt-1.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

  // assistant — Claude/ChatGPT style: no bubble, just content with subtle icon
  const parsed = parseModel(model)
  return (
    <div className="flex gap-4 my-8 group">
      <div className="size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
        <SparklesIcon className="size-3.5 text-primary" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <div className="text-[15px] leading-relaxed prose-message">{content}</div>
        <div className="flex items-center gap-3 mt-3 pt-2">
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
}
