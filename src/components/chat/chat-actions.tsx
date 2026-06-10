'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { PlusIcon, Trash2Icon, MessageSquareIcon, DownloadIcon, FileTextIcon, FileJsonIcon, FileIcon } from 'lucide-react'
import { relativeTime } from '@/lib/relative-time'
import type { Conversation } from '@/core/domain/entities/conversation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/shared/Toast'

// ---------------------------------------------------------------------------
// New Chat Button
// ---------------------------------------------------------------------------

export function NewChatButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleNewChat = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to create conversation')
      const { conversation } = await res.json()
      toast.success('Conversation created')
      router.push(`/chat/${conversation.id}`)
    } catch {
      toast.error('Failed to create conversation')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleNewChat}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      <PlusIcon className="size-3.5" />
      {loading ? 'Creating...' : 'New Chat'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Batch export helpers
// ---------------------------------------------------------------------------

const BATCH_FORMATS = [
  { key: 'md', label: 'Markdown', icon: FileTextIcon },
  { key: 'pdf', label: 'PDF', icon: FileIcon },
  { key: 'json', label: 'JSON', icon: FileJsonIcon },
] as const

async function downloadBatch(ids: string[], format: string) {
  const res = await fetch('/api/conversations/export/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, format }),
  })
  if (!res.ok) return

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conversations-${Date.now()}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Conversation List
// ---------------------------------------------------------------------------

interface ConversationListProps {
  conversations: Conversation[]
}

export function ConversationList({ conversations: initial }: ConversationListProps) {
  const [conversations, setConversations] = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast.success('Conversation deleted')
      } else {
        toast.error('Failed to delete conversation')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBatchExport = async (format: string) => {
    if (selectedIds.size === 0 || exporting) return
    setExporting(true)
    try {
      await downloadBatch(Array.from(selectedIds), format)
    } finally {
      setExporting(false)
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquareIcon className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          No conversations yet
        </p>
        <p className="text-xs text-muted-foreground">
          Start a new chat to begin.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Batch action bar — visible only when items are selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-6 pt-3">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={exporting}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <DownloadIcon className="size-3" />
              {exporting ? 'Exporting…' : 'Export'}
              <span className="ml-0.5">▼</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start">
              <DropdownMenuLabel>Export selected as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BATCH_FORMATS.map(({ key, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={key}
                  className="text-[13px]"
                  onClick={() => handleBatchExport(key)}
                >
                  <Icon className="size-3.5 text-muted-foreground" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {conversations.map((conv, i) => (
        <div
          key={conv.id}
          className={`group flex items-center hover:bg-accent/50 transition-colors ${
            i < conversations.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          {/* Checkbox */}
          <div className="pl-4 pr-2 flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.has(conv.id)}
              onChange={() => toggleSelect(conv.id)}
              aria-label={`Select "${conv.title || 'New conversation'}"`}
              className="size-3.5 rounded border-border accent-primary cursor-pointer"
            />
          </div>

          <Link
            href={`/chat/${conv.id}`}
            className="flex-1 flex items-center gap-3 px-2 py-3.5 min-w-0"
          >
            <MessageSquareIcon className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {conv.title || 'New conversation'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {relativeTime(conv.updatedAt)}
              </p>
            </div>
          </Link>
          <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleDelete(conv.id)}
              disabled={deletingId === conv.id}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              aria-label="Delete conversation"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
