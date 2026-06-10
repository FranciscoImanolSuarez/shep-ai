import type { LucideIcon } from 'lucide-react'
import { CircleIcon } from 'lucide-react'

type TimelineVariant = 'default' | 'success' | 'warning' | 'danger'

interface TimelineItem {
  timestamp: string
  title: string
  description?: string
  icon?: LucideIcon
  variant?: TimelineVariant
}

interface TimelineProps {
  items: TimelineItem[]
}

const DOT_COLORS: Record<TimelineVariant, string> = {
  default: 'bg-muted-foreground',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const variant = item.variant ?? 'default'
        const Icon = item.icon ?? CircleIcon
        const isLast = i === items.length - 1

        return (
          <div key={i} className="flex gap-4">
            {/* Left column: dot + line */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`size-2.5 rounded-full shrink-0 mt-1.5 ring-2 ring-background ${DOT_COLORS[variant]}`}
              />
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-0" />}
            </div>

            {/* Content */}
            <div className={`pb-6 min-w-0 ${isLast ? '' : ''}`}>
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                  {item.timestamp}
                </span>
                {item.icon && (
                  <Icon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
