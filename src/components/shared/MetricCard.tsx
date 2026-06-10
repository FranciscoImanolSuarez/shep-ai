import type { LucideIcon } from 'lucide-react'
import { Sparkline } from './Sparkline'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; positive?: boolean }
  sparkline?: number[]
  comparison?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  sparkline,
  comparison,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <div className="flex items-center gap-1.5 text-xs">
            {trend && (
              <span className={trend.positive ? 'text-primary' : 'text-destructive'}>
                {trend.positive ? '↑' : '↓'} {trend.value}%
              </span>
            )}
            {comparison && (
              <span className="text-muted-foreground">{comparison}</span>
            )}
          </div>
        </div>

        {sparkline && sparkline.length > 0 && (
          <Sparkline
            data={sparkline}
            width={80}
            height={32}
            color="oklch(0.6 0.22 250)"
          />
        )}
      </div>
    </div>
  )
}
