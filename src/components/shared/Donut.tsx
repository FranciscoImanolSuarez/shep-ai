interface DonutSegment {
  label: string
  value: number
  color?: string
}

interface DonutProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: string
}

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function computeArcs(
  segments: DonutSegment[],
  total: number,
  circumference: number,
) {
  let offset = 0
  return segments.map((seg, i) => {
    const pct = total === 0 ? 0 : seg.value / total
    const dash = pct * circumference
    const gap = circumference - dash
    const rotation = (offset / total) * 360 - 90
    offset += seg.value
    return { ...seg, dash, gap, rotation, color: seg.color ?? CHART_COLORS[i % CHART_COLORS.length] }
  })
}

export function Donut({
  segments,
  size = 120,
  thickness = 24,
  centerLabel,
}: DonutProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const cx = size / 2
  const cy = size / 2
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r

  const arcs = computeArcs(segments, total, circumference)

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={thickness}
          />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              transform={`rotate(${arc.rotation}, ${cx}, ${cy})`}
              strokeLinecap="round"
            />
          ))}
        </svg>
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-center leading-tight max-w-[60%] text-foreground">
              {centerLabel}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: arc.color }}
            />
            <span className="text-xs text-muted-foreground">{arc.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
