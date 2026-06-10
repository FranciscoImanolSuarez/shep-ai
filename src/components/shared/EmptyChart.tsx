interface EmptyChartProps {
  height?: number
  message?: string
}

export function EmptyChart({ height = 120, message = 'No data yet' }: EmptyChartProps) {
  // Generate skeleton bars with varying heights
  const bars = [40, 65, 30, 80, 55, 45, 70, 35, 60, 50, 75, 40]

  return (
    <div
      className="relative flex items-end justify-center rounded-lg border border-border bg-muted/30 overflow-hidden"
      style={{ height }}
      aria-label={message}
    >
      {/* Skeleton bars */}
      <div className="flex items-end gap-1 px-4 pb-3 w-full h-full">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-muted animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Overlay message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs text-muted-foreground/70 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
          {message}
        </span>
      </div>
    </div>
  )
}
