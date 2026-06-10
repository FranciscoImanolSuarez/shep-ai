import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  trend?: { value: number; positive?: boolean }
}

export function StatCard({ label, value, hint, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <div className="flex items-center gap-1.5 mt-1 text-xs">
        {trend && (
          <span className={trend.positive ? 'text-primary' : 'text-destructive'}>
            {trend.positive ? '↑' : '↓'} {trend.value}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}
