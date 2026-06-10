interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export function Sparkline({ data, width = 80, height = 24, color = 'currentColor' }: SparklineProps) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const points = data
    .map((v, i) => `${(i / (data.length - 1 || 1)) * width},${height - (v / max) * height}`)
    .join(' ')
  return (
    <svg width={width} height={height} className="text-current">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

interface BarChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export function BarChart({ data, width = 600, height = 80, color = 'oklch(0.6 0.22 250)' }: BarChartProps) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const barWidth = width / data.length
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * barWidth}
          y={height - (v / max) * height}
          width={barWidth - 2}
          height={(v / max) * height}
          fill={color}
          opacity={v === 0 ? 0.2 : 0.85}
          rx="1"
        />
      ))}
    </svg>
  )
}
