'use client'

import { useState, useEffect, useCallback } from 'react'
import { MailIcon, CheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <>
      <div className="h-14 px-6 border-b border-border flex items-center shrink-0">
        <span className="text-sm font-semibold tracking-tight">Pending Invitations</span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <MailIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-xl">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-4 rounded-lg border border-border"
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
      </div>
    </>
  )
}
