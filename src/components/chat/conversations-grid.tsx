'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Trash2Icon,
  ArrowUpRightIcon,
  DatabaseIcon,
  SearchIcon,
  XIcon,
  SparklesIcon,
  CornerUpRightIcon,
  CommandIcon,
} from 'lucide-react'
import type { Conversation } from '@/core/domain/entities/conversation'
import { relativeTime } from '@/lib/relative-time'
import { toast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type Provider = 'openai' | 'anthropic' | 'ollama'
function parseProvider(model?: string): { provider: Provider; name: string } | null {
  if (!model) return null
  if (model.includes('/')) {
    const [p, ...rest] = model.split('/')
    const lower = p.toLowerCase()
    if (lower === 'openai' || lower === 'anthropic' || lower === 'ollama') {
      return { provider: lower, name: rest.join('/') }
    }
  }
  if (model.startsWith('gpt')) return { provider: 'openai', name: model }
  if (model.startsWith('claude')) return { provider: 'anthropic', name: model }
  if (model.startsWith('llama') || model.startsWith('mistral')) return { provider: 'ollama', name: model }
  return null
}

const PROVIDER_BG: Record<Provider, string> = {
  openai: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  anthropic: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
  ollama: 'bg-violet-500/15 text-violet-600 border-violet-500/20',
}
const PROVIDER_INITIAL: Record<Provider, string> = {
  openai: 'O',
  anthropic: 'A',
  ollama: 'L',
}

interface ConversationsGridProps {
  conversations: Conversation[]
}

interface DateGroup {
  key: 'today' | 'yesterday' | 'week' | 'older'
  label: string
  items: Conversation[]
}

function groupByDate(conversations: Conversation[]): DateGroup[] {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: DateGroup[] = [
    { key: 'today', label: 'Today', items: [] },
    { key: 'yesterday', label: 'Yesterday', items: [] },
    { key: 'week', label: 'Earlier this week', items: [] },
    { key: 'older', label: 'Older', items: [] },
  ]

  for (const c of conversations) {
    const u = new Date(c.updatedAt).getTime()
    if (u >= todayStart.getTime()) groups[0].items.push(c)
    else if (u >= yesterdayStart.getTime()) groups[1].items.push(c)
    else if (u >= weekAgo.getTime()) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter((g) => g.items.length > 0)
}

// ──────────────────────────────────────────────────────────────
// Featured "Pick up" hero
// ──────────────────────────────────────────────────────────────

function FeaturedHero({ conv }: { conv: Conversation }) {
  const parsed = parseProvider(conv.model)
  return (
    <Link
      href={`/chat/${conv.id}`}
      className="group relative block rounded-3xl border border-border bg-card overflow-hidden hover:border-foreground/30 transition-all"
    >
      {/* Decorative gradient + dot pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.13] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="absolute -top-16 -right-16 size-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative p-8 sm:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[10px] font-mono tracking-widest text-primary uppercase">
              Pick up where you left off
            </span>
            <span className="size-0.5 rounded-full bg-muted-foreground" />
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {relativeTime(conv.updatedAt)}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {conv.title || 'New conversation'}
          </h2>
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            {parsed && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${PROVIDER_BG[parsed.provider]}`}>
                <span className="size-1.5 rounded-full bg-current opacity-70" />
                {parsed.name}
              </span>
            )}
            {conv.useRag && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                <DatabaseIcon className="size-3" />
                RAG enabled
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-end">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-sm group-hover:translate-x-0.5 transition-transform">
            Resume
            <CornerUpRightIcon className="size-3.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ──────────────────────────────────────────────────────────────
// Linear row item
// ──────────────────────────────────────────────────────────────

interface RowProps {
  conv: Conversation
  onDelete: (c: Conversation) => void
  isDeleting: boolean
}

function ConversationRow({ conv, onDelete, isDeleting }: RowProps) {
  const parsed = parseProvider(conv.model)
  return (
    <div
      className={`group relative flex items-center gap-4 px-3 sm:px-5 py-3 hover:bg-muted/40 transition-colors ${
        isDeleting ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Provider avatar */}
      <div
        className={`size-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-semibold ${
          parsed ? PROVIDER_BG[parsed.provider] : 'bg-muted text-muted-foreground border-border'
        }`}
      >
        {parsed ? PROVIDER_INITIAL[parsed.provider] : '?'}
      </div>

      {/* Title + meta */}
      <Link href={`/chat/${conv.id}`} className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {conv.title || 'New conversation'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-mono">
            <span>{parsed ? parsed.name : 'no model'}</span>
            {conv.useRag && (
              <>
                <span className="opacity-50">·</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <DatabaseIcon className="size-2.5" />
                  RAG
                </span>
              </>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
          {relativeTime(conv.updatedAt)}
        </span>
      </Link>

      {/* Actions on hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDelete(conv)}
          disabled={isDeleting}
          aria-label="Delete conversation"
          title="Delete"
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2Icon className="size-3.5" />
        </button>
        <Link
          href={`/chat/${conv.id}`}
          aria-label="Open conversation"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

export function ConversationsGrid({ conversations: initial }: ConversationsGridProps) {
  const [conversations, setConversations] = useState(initial)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f'
      if (isModK) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.trim().toLowerCase()
    return conversations.filter((c) => (c.title ?? '').toLowerCase().includes(q))
  }, [conversations, query])

  const groups = useMemo(() => groupByDate(filtered), [filtered])

  // Featured = the single most recent conversation (only when no search)
  const featured = !query && filtered.length > 0 ? filtered[0] : null

  // Build grouped list excluding the featured (if present)
  const groupsWithoutFeatured = useMemo(() => {
    if (!featured) return groups
    return groups
      .map((g) => ({ ...g, items: g.items.filter((c) => c.id !== featured.id) }))
      .filter((g) => g.items.length > 0)
  }, [groups, featured])

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeletingId(id)
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        toast.success('Conversation deleted')
        setDeleteTarget(null)
      } else {
        toast.error('Failed to delete')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Search bar */}
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-xl">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-11 pl-10 pr-24 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query ? (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">
                  <CommandIcon className="size-2.5 inline" />
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">F</kbd>
              </span>
            )}
          </div>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'thread' : 'threads'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-muted mb-4">
            <SearchIcon className="size-5 text-muted-foreground/60" />
          </div>
          <p className="text-base font-semibold mb-1">
            {query ? `No matches for "${query}"` : 'Nothing here'}
          </p>
          <p className="text-sm text-muted-foreground">
            {query ? 'Try a different keyword or clear the search.' : 'Once you start chatting, your threads will appear here.'}
          </p>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              Clear search
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Featured hero */}
          {featured && (
            <div className="mb-12">
              <FeaturedHero conv={featured} />
            </div>
          )}

          {/* Linear list grouped by date */}
          {groupsWithoutFeatured.length > 0 && (
            <div className="space-y-10">
              {groupsWithoutFeatured.map((group) => (
                <div key={group.key}>
                  {/* Group divider */}
                  <div className="flex items-center gap-3 mb-2 px-3 sm:px-5">
                    <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                      {group.items.length}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Linear rows */}
                  <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {group.items.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        onDelete={setDeleteTarget}
                        isDeleting={deletingId === conv.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* If featured exists but no other items left */}
          {featured && groupsWithoutFeatured.length === 0 && !query && (
            <div className="mt-6 text-center">
              <p className="text-[11px] font-mono text-muted-foreground/70 tracking-widest uppercase">
                ── That&apos;s your only thread ──
              </p>
            </div>
          )}
        </>
      )}

      {/* Featured icon decoration accent — Sparkle ref */}
      <span className="sr-only" aria-hidden="true"><SparklesIcon /></span>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Delete conversation"
        description={
          <>
            Delete <strong>{deleteTarget?.title || 'this conversation'}</strong>? All messages will be permanently removed.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={!!deletingId}
        onConfirm={confirmDelete}
      />
    </>
  )
}
