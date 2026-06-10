interface UsageQuotaProps {
  used: number
  limit: number
  unit?: string
  warningAt?: number
  dangerAt?: number
}

export function UsageQuota({
  used,
  limit,
  unit,
  warningAt = 75,
  dangerAt = 90,
}: UsageQuotaProps) {
  const pct = Math.min(100, Math.max(0, (used / limit) * 100))

  const barColor =
    pct >= dangerAt
      ? 'bg-red-500'
      : pct >= warningAt
      ? 'bg-amber-500'
      : 'bg-primary'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}{unit ? ` ${unit}` : ''}
        </span>
        <span
          className={`font-mono font-medium tabular-nums ${
            pct >= dangerAt
              ? 'text-red-500'
              : pct >= warningAt
              ? 'text-amber-500'
              : 'text-muted-foreground'
          }`}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        />
      </div>
    </div>
  )
}
