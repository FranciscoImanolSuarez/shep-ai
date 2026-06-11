'use client'

import { useState, useEffect, useCallback } from 'react'
import { MailIcon, CheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import type { WorkspaceInvitation } from '@/core/domain/entities/workspace'

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/workspaces/invitations')
      .then((r) => r.json())
      .then((d) => setInvitations(d.invitations ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function accept(inviteId: string) {
    setActing(inviteId)
    try {
      const res = await fetch(`/api/workspaces/invitations/${inviteId}/accept`, {
        method: 'POST',
      })
      if (res.ok || res.status === 201) refresh()
    } finally {
      setActing(null)
    }
  }

  async function decline(inviteId: string) {
    setActing(inviteId)
    try {
      await fetch(`/api/workspaces/invitations/${inviteId}`, { method: 'DELETE' })
      refresh()
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="TEAM"
        title="Invitations"
        description="Accept or decline pending workspace invitations."
        variant="default"
        stats={!loading && invitations.length > 0 ? [{ label: 'Pending', value: invitations.length }] : undefined}
      />

      <PageBody className="space-y-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <EmptyState
            icon={MailIcon}
            title="No pending invitations"
            description="You're all caught up. Invitations from workspace admins will appear here."
          />
        ) : (
          <div className="space-y-2 max-w-xl">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">Workspace invitation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Role: <span className="uppercase tracking-wider">{inv.role}</span>
                    {' · '}
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decline(inv.id)}
                    disabled={acting === inv.id}
                  >
                    <XIcon />
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => accept(inv.id)}
                    disabled={acting === inv.id}
                  >
                    <CheckIcon />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  )
}
