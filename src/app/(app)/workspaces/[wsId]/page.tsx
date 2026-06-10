'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MembersTable } from '@/components/workspace/members-table'
import { InviteModal } from '@/components/workspace/invite-modal'
import type { WorkspaceWithRole, WorkspaceMember, WorkspaceInvitation } from '@/core/domain/entities/workspace'

type Tab = 'general' | 'members' | 'invitations'

interface Props {
  params: Promise<{ wsId: string }>
}

export default function WorkspaceSettingsPage({ params }: Props) {
  const { wsId } = use(params)
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('general')
  const [workspace, setWorkspace] = useState<WorkspaceWithRole | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadWorkspace = useCallback(() => {
    fetch(`/api/workspaces/${wsId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.workspace) {
          setWorkspace(d.workspace)
          setEditName(d.workspace.name)
        }
      })
  }, [wsId])

  const loadMembers = useCallback(() => {
    fetch(`/api/workspaces/${wsId}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
  }, [wsId])

  const loadInvitations = useCallback(() => {
    fetch('/api/workspaces/invitations')
      .then((r) => r.json())
      .then((d) => setInvitations(
        (d.invitations ?? []).filter((i: WorkspaceInvitation) => i.workspaceId === wsId),
      ))
  }, [wsId])

  // Get current user email from session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d?.user?.email ?? ''))
  }, [])

  useEffect(() => {
    Promise.all([loadWorkspace(), loadMembers(), loadInvitations()]).finally(() => setLoading(false))
  }, [loadWorkspace, loadMembers, loadInvitations])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim() || !workspace) return
    setSaving(true)
    try {
      const res = await fetch(`/api/workspaces/${wsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (res.ok) loadWorkspace()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/workspaces/${wsId}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      router.push('/workspaces')
    }
  }

  async function declineInvitation(inviteId: string) {
    await fetch(`/api/workspaces/invitations/${inviteId}`, { method: 'DELETE' })
    loadInvitations()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Workspace not found.</p>
      </div>
    )
  }

  const isOwner = workspace.role === 'owner'

  return (
    <>
      {/* Header */}
      <div className="h-14 px-6 border-b border-border flex items-center shrink-0">
        <span className="text-sm font-semibold tracking-tight">{workspace.name}</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-6">
        <div className="flex gap-6">
          {(['general', 'members', 'invitations'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-[13px] font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6 max-w-2xl space-y-6">
        {tab === 'general' && (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Workspace name</h2>
              <form onSubmit={handleSaveName} className="flex gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </form>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-semibold">Plan</h2>
              <p className="text-sm text-muted-foreground capitalize">{workspace.plan}</p>
            </section>

            <section className="space-y-3 pt-6 border-t border-border">
              <div>
                <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Deleting a workspace is permanent. Remove all other members first.
                </p>
              </div>
              {isOwner && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <TrashIcon />
                  Delete workspace
                </Button>
              )}
            </section>
          </>
        )}

        {tab === 'members' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{members.length} member{members.length !== 1 ? 's' : ''}</h2>
              {(isOwner || workspace.role === 'admin') && (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <PlusIcon />
                  Invite
                </Button>
              )}
            </div>
            <MembersTable
              members={members}
              workspaceId={wsId}
              currentUserId={currentUserId}
              currentRole={workspace.role}
              onMemberUpdated={loadMembers}
            />
          </>
        )}

        {tab === 'invitations' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Pending invitations</h2>
              {(isOwner || workspace.role === 'admin') && (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <PlusIcon />
                  Invite
                </Button>
              )}
            </div>

            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Expires</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">{inv.inviteeEmail}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{inv.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => declineInvitation(inv.id)}
                          >
                            <TrashIcon className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite modal */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={wsId}
        onSuccess={loadInvitations}
      />

      {/* Delete confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{workspace.name}</strong>? This action is permanent and cannot be undone.
            All resources will be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
