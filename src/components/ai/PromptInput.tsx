'use client'

import type { ReactNode, KeyboardEvent } from 'react'
import { useRef, useEffect } from 'react'
import { SendIcon, PaperclipIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  model?: ReactNode
  attachments?: File[]
  onAttach?: () => void
  footer?: ReactNode
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Message...',
  disabled = false,
  model,
  onAttach,
  footer,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 8 * 24 // ~8 rows
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const isSubmit = (e.metaKey || e.ctrlKey) && e.key === 'Enter'
    if (isSubmit && !disabled && value.trim()) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring transition-all">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 leading-relaxed"
        style={{ minHeight: '52px', maxHeight: '192px' }}
        aria-label="Message input"
      />

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-3 pb-3 gap-2">
        <div className="flex items-center gap-2">
          {model}
          {onAttach && (
            <button
              onClick={onAttach}
              disabled={disabled}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Attach file"
            >
              <PaperclipIcon className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {footer}
          <span className="text-[10px] text-muted-foreground hidden sm:block">
            ⌘↵ to send
          </span>
          <Button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            size="icon-sm"
            aria-label="Send message"
          >
            <SendIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
