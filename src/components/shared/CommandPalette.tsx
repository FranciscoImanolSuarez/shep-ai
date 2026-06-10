'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquareIcon,
  BotIcon,
  GitBranchIcon,
  ActivityIcon,
  DatabaseIcon,
  PaintbrushIcon,
  PlusIcon,
} from 'lucide-react'
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'

interface CommandEntry {
  id: string
  label: string
  icon: typeof MessageSquareIcon
  shortcut?: string
  group: string
  action: () => void
}

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const router = useRouter()

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [setOpen])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  const COMMANDS: CommandEntry[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquareIcon,
      group: 'Navigate',
      shortcut: 'G C',
      action: () => router.push('/chat'),
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: BotIcon,
      group: 'Navigate',
      shortcut: 'G A',
      action: () => router.push('/agents'),
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: GitBranchIcon,
      group: 'Navigate',
      shortcut: 'G W',
      action: () => router.push('/workflows'),
    },
    {
      id: 'observability',
      label: 'Observability',
      icon: ActivityIcon,
      group: 'Navigate',
      shortcut: 'G O',
      action: () => router.push('/observability'),
    },
    {
      id: 'knowledge-bases',
      label: 'Knowledge Bases',
      icon: DatabaseIcon,
      group: 'Navigate',
      shortcut: 'G K',
      action: () => router.push('/knowledge-bases'),
    },
    {
      id: 'design',
      label: 'Design system',
      icon: PaintbrushIcon,
      group: 'Navigate',
      action: () => router.push('/design'),
    },
    {
      id: 'new-agent',
      label: 'New agent',
      icon: PlusIcon,
      group: 'Actions',
      shortcut: 'N A',
      action: () => router.push('/agents/new'),
    },
    {
      id: 'new-workflow',
      label: 'New workflow',
      icon: PlusIcon,
      group: 'Actions',
      shortcut: 'N W',
      action: () => router.push('/workflows/new'),
    },
  ]

  const groups = Array.from(new Set(COMMANDS.map((c) => c.group)))

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search or jump to…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map((group, gi) => (
            <span key={group}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {COMMANDS.filter((c) => c.group === group).map((cmd) => (
                  <CommandItem key={cmd.id} onSelect={() => run(cmd.action)}>
                    <cmd.icon className="size-4 text-muted-foreground" />
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </span>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
