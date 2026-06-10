'use client'

interface DateRange {
  from: string
  to: string
}

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (range: DateRange) => void
}

function subtractDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const PRESETS = [
  { label: 'Last 7d', days: 7 },
  { label: 'Last 30d', days: 30 },
  { label: 'Last 90d', days: 90 },
] as const

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <div className="space-y-2">
      {/* Preset chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange({ from: subtractDays(preset.days), to: today() })}
            className="px-2 py-0.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
          aria-label="From date"
        />
        <span className="text-muted-foreground text-sm">→</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
          aria-label="To date"
        />
      </div>
      <p className="text-[10px] text-muted-foreground font-mono">YYYY-MM-DD</p>
    </div>
  )
}
