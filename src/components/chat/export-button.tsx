'use client'

import { DownloadIcon, FileTextIcon, FileJsonIcon, FileIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  conversationId: string
}

const FORMATS = [
  { key: 'md', label: 'Markdown', icon: FileTextIcon },
  { key: 'pdf', label: 'PDF', icon: FileIcon },
  { key: 'json', label: 'JSON', icon: FileJsonIcon },
] as const

export function ExportButton({ conversationId }: ExportButtonProps) {
  const handleExport = (format: string) => {
    const url = `/api/conversations/${conversationId}/export?format=${format}`
    window.location.assign(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        aria-label="Export conversation"
      >
        <DownloadIcon className="size-3.5" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuLabel>Export as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map(({ key, label, icon: Icon }) => (
          <DropdownMenuItem
            key={key}
            className="text-[13px]"
            onClick={() => handleExport(key)}
          >
            <Icon className="size-3.5 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
