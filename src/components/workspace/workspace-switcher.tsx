'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckIcon, ChevronDownIcon, PlusIcon, SettingsIcon, MailIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkspaceWithRole } from '@/core/domain/entities/workspace'

interface WorkspaceSwitcherProps {
  initialWorkspaces?: WorkspaceWithRole[]
  initialActiveId?: string
}

export function WorkspaceSwitcher({ initialWorkspaces = [], initialActiveId }: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>(initialWorkspaces)
  const [activeId, setActiveId] = useState<string | undefined>(initialActiveId)
  const [pendingCount, setPendingCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((d) => {
        if (d.workspaces) setWorkspaces(d.workspaces)
        if (!activeId && d.workspaces?.length > 0) setActiveId(d.workspaces[0].id)
      })
      .catch(() => {/* silent */})

    fetch('/api/workspaces/invitations')
      .then((r) => r.json())
      .then((d) => setPendingCount(d.invitations?.length ?? 0))
      .catch(() => {/* silent */})
  }, [activeId])

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0]

  function switchWorkspace(id: string) {
    startTransition(async () => {
      await fetch('/api/users/me/active-workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: id }),
      })
      setActiveId(id)
      router.refresh()
    })
  }

  if (workspaces.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
        <span className="text-[13px] font-medium truncate text-sidebar-foreground">
          {activeWorkspace?.name ?? 'Select workspace'}
        </span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>

        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => switchWorkspace(ws.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{ws.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {ws.role}
              </span>
              {ws.id === activeId && <CheckIcon className="size-3.5 text-muted-foreground" />}
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {pendingCount > 0 && (
          <DropdownMenuItem render={<Link href="/invitations" className="flex items-center gap-1.5" />}>
            <MailIcon className="size-4" />
            <span>{pendingCount} pending invitation{pendingCount !== 1 ? 's' : ''}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem render={<Link href="/workspaces/new" className="flex items-center gap-1.5" />}>
          <PlusIcon className="size-4" />
          Create workspace
        </DropdownMenuItem>

        {activeWorkspace && (
          <DropdownMenuItem render={<Link href={`/workspaces/${activeWorkspace.id}`} className="flex items-center gap-1.5" />}>
            <SettingsIcon className="size-4" />
            Manage workspace
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
