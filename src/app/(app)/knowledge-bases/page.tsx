'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LibraryIcon, PlusIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/components/shared/Toast'

interface KnowledgeBase {
  id: string
  name: string
  description: string
  documentCount?: number
  createdAt: string
}

interface KbStats {
  docCount: number
  estimatedTokens: number
  lastIngestedAt: string | null
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function KbStatsRow({ kbId }: { kbId: string }) {
  const [stats, setStats] = useState<KbStats | null>(null)

  useEffect(() => {
    fetch(`/api/knowledge-bases/${kbId}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d) })
      .catch(() => {})
  }, [kbId])

  if (!stats) return null

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
      <span>{stats.docCount} doc{stats.docCount !== 1 ? 's' : ''}</span>
      <span className="text-border">·</span>
      <span>~{formatTokens(stats.estimatedTokens)} tokens</span>
      <span className="text-border">·</span>
      <span>ingested {relativeTime(stats.lastIngestedAt)}</span>
    </div>
  )
}

interface KbFormState {
  name: string
  description: string
}

export default function KnowledgeBasesPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KnowledgeBase | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null)
  const [form, setForm] = useState<KbFormState>({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/knowledge-bases')
      .then((r) => r.json())
      .then((d) => setKbs(d.knowledgeBases ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function openCreate() {
    setForm({ name: '', description: '' })
    setCreateOpen(true)
  }

  function openEdit(kb: KnowledgeBase) {
    setForm({ name: kb.name, description: kb.description })
    setEditTarget(kb)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), description: form.description }),
      })
      if (res.ok) {
        setCreateOpen(false)
        refresh()
        toast.success('Knowledge base created')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget || !form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/knowledge-bases/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), description: form.description }),
      })
      if (res.ok) {
        setEditTarget(null)
        refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/knowledge-bases/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete knowledge base')
      setDeleteTarget(null)
      return
    }
    setDeleteTarget(null)
    setKbs((prev) => prev.filter((k) => k.id !== deleteTarget.id))
    toast.success('Knowledge base deleted')
  }

  const createButton = (
    <Button size="sm" onClick={openCreate}>
      <PlusIcon />
      New knowledge base
    </Button>
  )

  return (
    <>
      <Hero
        eyebrow="KNOWLEDGE"
        title="Knowledge bases"
        accent="Knowledge"
        description="Organize documents into knowledge bases for RAG-powered agents."
        variant="gradient"
        actions={createButton}
        stats={kbs.length > 0 ? [
          { label: 'Knowledge bases', value: kbs.length },
        ] : undefined}
      />

      <PageBody>
        <SectionDivider label="Your knowledge bases" align="left" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : kbs.length === 0 ? (
          <EmptyState
            icon={LibraryIcon}
            title="No knowledge bases yet"
            description="Create your first knowledge base to start organizing documents."
            action={<Button size="sm" onClick={openCreate}>Create your first knowledge base</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kbs.map((kb) => (
              <Link
                key={kb.id}
                href={`/knowledge-bases/${kb.id}`}
                className="group block border border-border rounded-xl p-4 hover:border-foreground/30 hover:bg-muted/30 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{kb.name}</p>
                  <div onClick={(e) => e.preventDefault()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded hover:bg-muted transition-colors shrink-0">
                        <MoreHorizontalIcon className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(kb)}>
                          <PencilIcon className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(kb)}
                          className="text-destructive focus:text-destructive"
                        >
                          <TrashIcon className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {kb.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kb.description}</p>
                )}
                <KbStatsRow kbId={kb.id} />
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  Open and upload
                  <ArrowRightIcon className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New knowledge base</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Legal docs"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit knowledge base</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete knowledge base</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteTarget?.name}</strong>? All documents and their chunks will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
