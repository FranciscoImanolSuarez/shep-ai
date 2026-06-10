import type { ReactNode } from 'react'
import {
  XIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react'

type Variant = 'info' | 'success' | 'warning' | 'danger' | 'feature'

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; icon: LucideIcon; color: string }
> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/50',
    icon: InfoIcon,
    color: 'text-blue-700 dark:text-blue-400',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-950/20 border-green-200/50 dark:border-green-900/50',
    icon: CheckCircleIcon,
    color: 'text-green-700 dark:text-green-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/50',
    icon: AlertTriangleIcon,
    color: 'text-amber-700 dark:text-amber-400',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50',
    icon: AlertCircleIcon,
    color: 'text-red-700 dark:text-red-400',
  },
  feature: {
    bg: 'bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20',
    icon: SparklesIcon,
    color: 'text-primary',
  },
}

interface BannerProps {
  variant?: Variant
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  onDismiss?: () => void
}

export function Banner({
  variant = 'info',
  icon,
  title,
  description,
  action,
  onDismiss,
}: BannerProps) {
  const config = VARIANT_STYLES[variant]
  const Icon = icon ?? config.icon
  return (
    <div
      className={`rounded-xl border px-5 py-4 flex items-start gap-4 ${config.bg}`}
    >
      <div className={`shrink-0 ${config.color}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors -mt-0.5"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  )
}
