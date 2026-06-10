'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, MoreHorizontalIcon, StoreIcon } from 'lucide-react'
import type { PublishedAgent } from '@/core/domain/entities/published-agent'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader, PageBody } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
import { Alert } from '@/components/shared/Alert'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/components/shared/Toast'

export default function MyPublishedPage() {
  const [agents, setAgents] = useState<PublishedAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [unpublishTarget, setUnpublishTarget] = useState<PublishedAgent | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/marketplace/mine')
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleUpdate(pubId: string) {
    setActioningId(pubId)
    setError('')
    try {
      const res = await fetch(`/api/marketplace/${pubId}/update`, { method: 'POST' })
      if (res.ok) {
        refresh()
        toast.success('Update pushed')
      } else {
        const data = await res.json()
        const msg = data.error ?? 'Update failed'
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setActioningId(null)
    }
  }

  async function confirmUnpublish() {
    if (!unpublishTarget) return
    const pubId = unpublishTarget.id
    setActioningId(pubId)
    setError('')
    try {
      const res = await fetch(`/api/marketplace/${pubId}`, { method: 'DELETE' })
      if (res.ok) {
        setAgents((prev) => prev.map((a) => a.id === pubId ? { ...a, isPublic: false } : a))
        toast.success('Agent unpublished')
        setUnpublishTarget(null)
      } else {
        const data = await res.json()
        const msg = data.error ?? 'Unpublish failed'
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setActioningId(null)
    }
  }

  const backLink = (
    <Link
      href="/marketplace"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeftIcon className="size-3" />
      Marketplace
    </Link>
  )

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="My published agents"
        description="Manage versions and visibility of the agents you've published to the marketplace."
        breadcrumb={backLink}
      />

      <PageBody className="space-y-4">
        {error && (
          <Alert variant="danger" description={error} onDismiss={() => setError('')} />
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title="No published agents yet"
            description="Publish one of your agents to the marketplace to see it here."
            action={
              <Link
                href="/agents"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                Go to Agents
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border border-border rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <Badge variant="muted">v{agent.version}</Badge>
                    {!agent.isPublic && <Badge variant="warning">Unpublished</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {agent.installCount} install{agent.installCount !== 1 ? 's' : ''}
                    {agent.averageRating > 0 && ` · ★ ${agent.averageRating.toFixed(1)}`}
                    {' · '}
                    <span className="capitalize">{agent.category}</span>
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={actioningId === agent.id}
                    className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <MoreHorizontalIcon className="size-4" strokeWidth={1.5} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUpdate(agent.id)}>
                      Push update
                    </DropdownMenuItem>
                    {agent.isPublic && (
                      <DropdownMenuItem
                        onClick={() => setUnpublishTarget(agent)}
                        className="text-destructive focus:text-destructive"
                      >
                        Unpublish
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </PageBody>

      <ConfirmDialog
        open={!!unpublishTarget}
        onOpenChange={(o) => { if (!o) setUnpublishTarget(null) }}
        title="Unpublish agent"
        description={
          <>
            Unpublish <strong>{unpublishTarget?.name}</strong> from the marketplace? Existing installs will remain functional, but new users won&apos;t be able to install it.
          </>
        }
        confirmLabel="Unpublish"
        variant="destructive"
        loading={!!actioningId}
        onConfirm={confirmUnpublish}
      />
    </div>
  )
}
