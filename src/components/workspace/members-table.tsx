'use client'

import { TrashIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { WorkspaceMember, Role } from '@/core/domain/entities/workspace'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
]

interface MembersTableProps {
  members: WorkspaceMember[]
  workspaceId: string
  currentUserId: string
  currentRole: Role
  onMemberUpdated?: () => void
}

export function MembersTable({
  members,
  workspaceId,
  currentUserId,
  currentRole,
  onMemberUpdated,
}: MembersTableProps) {
  const canManage = currentRole === 'owner' || currentRole === 'admin'

  async function changeRole(userId: string, role: Role) {
    await fetch(`/api/workspaces/${workspaceId}/members/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    onMemberUpdated?.()
  }

  async function removeMember(userId: string) {
    await fetch(`/api/workspaces/${workspaceId}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
    onMemberUpdated?.()
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Member</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Role</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Joined</th>
            {canManage && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId
            const isOwner = member.role === 'owner'

            return (
              <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">
                  {member.userId}
                  {isSelf && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">(you)</span>}
                </td>
                <td className="px-4 py-3">
                  {canManage && !isOwner && !isSelf ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => changeRole(member.userId, v as Role)}
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {!isOwner && !isSelf && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(member.userId)}
                      >
                        <TrashIcon className="size-3.5" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
