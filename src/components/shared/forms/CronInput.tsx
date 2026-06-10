'use client'

import { Input } from '@/components/ui/input'

interface CronInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function parseCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return 'Custom schedule'

  const [min, hour, dom, , dow] = parts

  // Every N minutes: */N * * * *
  if (min.startsWith('*/') && hour === '*' && dom === '*') {
    const n = min.slice(2)
    if (/^\d+$/.test(n)) {
      const num = parseInt(n, 10)
      if (num === 1) return 'Every minute'
      return `Every ${num} minutes`
    }
  }

  // Every hour on the minute: 0 * * * *
  if (min === '0' && hour === '*' && dom === '*') {
    return 'Every hour'
  }

  // Specific time daily: M H * * *
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*') {
    const h = parseInt(hour, 10)
    const m = parseInt(min, 10)
    const ampm = h < 12 ? 'AM' : 'PM'
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
    const displayM = m.toString().padStart(2, '0')
    const timeStr = `${displayH}:${displayM} ${ampm}`

    if (dow === '*') return `Every day at ${timeStr}`
    if (dow === '1-5') return `Every weekday at ${timeStr}`
    if (dow === '6,0' || dow === '0,6') return `Every weekend at ${timeStr}`

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (/^\d$/.test(dow)) {
      const dayIndex = parseInt(dow, 10)
      return `Every ${DAY_NAMES[dayIndex] ?? 'day'} at ${timeStr}`
    }
  }

  // @hourly / @daily shortcuts (not standard but common)
  if (expr.trim() === '0 0 * * *') return 'Every day at 12:00 AM'
  if (expr.trim() === '0 * * * *') return 'Every hour'
  if (expr.trim() === '* * * * *') return 'Every minute'

  return 'Custom schedule'
}

export function CronInput({ value, onChange, placeholder = '0 9 * * 1-5' }: CronInputProps) {
  const preview = value.trim() ? parseCron(value) : null

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono"
        aria-label="Cron expression"
      />
      {preview && (
        <p className="text-xs text-muted-foreground">
          <span className="mr-1">↻</span>
          <span
            className={preview === 'Custom schedule' ? 'text-muted-foreground/60 italic' : ''}
          >
            {preview}
          </span>
        </p>
      )}
    </div>
  )
}
