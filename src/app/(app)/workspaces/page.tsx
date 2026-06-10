'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PlusIcon, BuildingIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { WorkspaceWithRole } from '@/core/domain/entities/workspace'

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((d) => setWorkspaces(d.workspaces ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        setName('')
        setCreateOpen(false)
        refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold tracking-tight">Workspaces</span>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          New workspace
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <BuildingIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No workspaces yet.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>Create your first workspace</Button>
          </div>
        ) : (
          workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="flex items-center justify-between px-4 py-3.5 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium">{ws.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="uppercase tracking-wider">{ws.role}</span>
                  {' · '}
                  <span className="capitalize">{ws.plan}</span> plan
                </p>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Workspace name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme AI Team"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
