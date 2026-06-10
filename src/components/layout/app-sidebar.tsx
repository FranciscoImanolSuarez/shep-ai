'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  FileTextIcon,
  PlugIcon,
  BotIcon,
  ClockIcon,
  BarChart3Icon,
  LibraryIcon,
  ChevronDownIcon,
  LogOutIcon,
  StoreIcon,
  ActivityIcon,
  WorkflowIcon,
  PaletteIcon,
  SettingsIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher'
import { KeyboardShortcut } from '@/components/shared/KeyboardShortcut'

interface AppSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  workspacesEnabled?: boolean
}

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboardIcon },
    ],
  },
  {
    label: 'Build',
    items: [
      { href: '/chat', label: 'Chat', icon: MessageSquareIcon },
      { href: '/agents', label: 'Agents', icon: BotIcon },
      { href: '/workflows', label: 'Workflows', icon: WorkflowIcon },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { href: '/knowledge-bases', label: 'Knowledge bases', icon: LibraryIcon },
      { href: '/documents', label: 'Documents', icon: FileTextIcon },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3Icon },
      { href: '/observability', label: 'Observability', icon: ActivityIcon },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/marketplace', label: 'Marketplace', icon: StoreIcon },
      { href: '/schedules', label: 'Schedules', icon: ClockIcon },
      { href: '/integrations', label: 'Integrations', icon: PlugIcon },
      { href: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
  {
    label: 'Developers',
    items: [
      { href: '/design', label: 'Design system', icon: PaletteIcon },
    ],
  },
] as const

export function AppSidebar({ user, workspacesEnabled = false }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const initial =
    user.name?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    '?'

  return (
    <aside className="w-[240px] border-r border-border flex flex-col bg-sidebar shrink-0">
      {/* Brand */}
      <div className="h-14 px-5 flex items-center border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-xs font-bold text-background">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Shep AI
          </span>
        </div>
      </div>

      {/* Workspace switcher — only rendered when feature flag is on */}
      {workspacesEnabled && (
        <div className="px-3 py-2 border-b border-border">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 pt-1 pb-1">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors border-l-2 ${
                    active
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'
                  }`}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Version hint + keyboard shortcut */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/60 tabular-nums">Shep AI · v0.1</p>
        <KeyboardShortcut keys={['⌘', 'K']} />
      </div>

      {/* User menu */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="size-7 rounded-full shrink-0"
              />
            ) : (
              <span className="size-7 rounded-full bg-sidebar-accent text-sidebar-foreground flex items-center justify-center text-xs font-medium shrink-0">
                {initial}
              </span>
            )}
            <span className="text-[13px] truncate flex-1 text-sidebar-foreground">
              {user.name ?? user.email}
            </span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            {user.email && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
