import type { ReactNode } from 'react'
import {
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  XIcon,
} from 'lucide-react'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

const VARIANT_STYLES: Record<
  AlertVariant,
  { border: string; bg: string; stripe: string; icon: string; defaultIcon: typeof InfoIcon }
> = {
  info: {
    border: 'border-blue-200 dark:border-blue-900/50',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    stripe: 'bg-blue-500',
    icon: 'text-blue-600 dark:text-blue-400',
    defaultIcon: InfoIcon,
  },
  success: {
    border: 'border-green-200 dark:border-green-900/50',
    bg: 'bg-green-50 dark:bg-green-900/10',
    stripe: 'bg-green-500',
    icon: 'text-green-600 dark:text-green-400',
    defaultIcon: CheckCircleIcon,
  },
  warning: {
    border: 'border-amber-200 dark:border-amber-900/50',
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    stripe: 'bg-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    defaultIcon: AlertTriangleIcon,
  },
  danger: {
    border: 'border-red-200 dark:border-red-900/50',
    bg: 'bg-red-50 dark:bg-red-900/10',
    stripe: 'bg-red-500',
    icon: 'text-red-600 dark:text-red-400',
    defaultIcon: AlertCircleIcon,
  },
}

interface AlertProps {
  variant: AlertVariant
  title?: string
  description: string
  icon?: typeof InfoIcon
  action?: ReactNode
  onDismiss?: () => void
}

export function Alert({ variant, title, description, icon, action, onDismiss }: AlertProps) {
  const styles = VARIANT_STYLES[variant]
  const Icon = icon ?? styles.defaultIcon

  return (
    <div
      role="alert"
      className={`flex overflow-hidden rounded-lg border ${styles.border} ${styles.bg}`}
    >
      {/* Left accent stripe */}
      <div className={`w-1 shrink-0 ${styles.stripe}`} />

      {/* Icon */}
      <div className="flex items-start gap-3 flex-1 p-4">
        <Icon className={`size-4 shrink-0 mt-0.5 ${styles.icon}`} />

        {/* Text */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {title && (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Action + dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Dismiss alert"
              className="size-5 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <XIcon className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
