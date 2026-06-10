type ProgressVariant = 'default' | 'success' | 'warning' | 'danger'

const VARIANT_COLOR: Record<ProgressVariant, string> = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  variant?: ProgressVariant
  showValue?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  label,
  variant = 'default',
  showValue = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="w-full space-y-1.5">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${VARIANT_COLOR[variant]}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
