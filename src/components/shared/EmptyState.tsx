import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-5">
        <div className="size-14 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}
