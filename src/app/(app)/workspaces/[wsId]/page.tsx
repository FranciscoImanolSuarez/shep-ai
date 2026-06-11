'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, TrashIcon, BuildingIcon, MailIcon } from 'lucide-react'
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
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { Tabs } from '@/components/shared/Tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { Spinner } from '@/components/shared/Spinner'
import { Badge } from '@/components/shared/Badge'

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
        <Spinner size="lg" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex-1 overflow-auto">
        <PageBody className="pt-12">
          <EmptyState
            icon={BuildingIcon}
            title="Workspace not found"
            description="This workspace may have been deleted or you don't have access."
          />
        </PageBody>
      </div>
    )
  }

  const isOwner = workspace.role === 'owner'

  const tabItems = [
    { value: 'general', label: 'General' },
    { value: 'members', label: `Members${members.length > 0 ? ` (${members.length})` : ''}` },
    { value: 'invitations', label: `Invitations${invitations.length > 0 ? ` (${invitations.length})` : ''}` },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="TEAM"
        title={workspace.name}
        description={`${workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)} · ${workspace.plan.charAt(0).toUpperCase() + workspace.plan.slice(1)} plan`}
        variant="default"
      />

      <PageBody className="space-y-6">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          items={tabItems}
        />

        <div className="max-w-2xl space-y-6">
          <Tabs.Content value="general" current={tab}>
            <div className="space-y-6">
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
            </div>
          </Tabs.Content>

          <Tabs.Content value="members" current={tab}>
            <div className="space-y-4">
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
            </div>
          </Tabs.Content>

          <Tabs.Content value="invitations" current={tab}>
            <div className="space-y-4">
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
                <EmptyState
                  icon={MailIcon}
                  title="No pending invitations"
                  description="Invite team members to collaborate in this workspace."
                  action={
                    (isOwner || workspace.role === 'admin') ? (
                      <Button size="sm" onClick={() => setInviteOpen(true)}>
                        <PlusIcon />
                        Send invitation
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{inv.inviteeEmail}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="muted">{inv.role}</Badge>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => declineInvitation(inv.id)}
                      >
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>
        </div>
      </PageBody>

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
    </div>
  )
}
