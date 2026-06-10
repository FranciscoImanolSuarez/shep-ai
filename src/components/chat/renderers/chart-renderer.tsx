'use client'

import { useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'

interface SVGRendererProps {
  code: string
  isIncomplete: boolean
  language: string
}

// Chart data schema
interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'horizontal-bar'
  title?: string
  data: Array<{ label: string; value: number; color?: string }>
  yLabel?: string
  xLabel?: string
}

const COLORS = [
  '#171717', '#525252', '#a3a3a3', '#d4d4d4',
  '#0070f3', '#7928ca', '#f81ce5', '#ff0080',
  '#50e3c2', '#f5a623', '#e00', '#79ffe1',
]

function getColor(index: number, custom?: string): string {
  return custom ?? COLORS[index % COLORS.length]
}

// --- Bar Chart (Vertical) ---
function BarChart({ data, title, yLabel, xLabel }: Omit<ChartData, 'type'>) {
  const maxValue = Math.max(...data.map(d => d.value))
  const chartHeight = 200
  const barWidth = Math.min(48, Math.max(24, 300 / data.length))
  const chartWidth = data.length * (barWidth + 12) + 40

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`} className="w-full max-w-full" style={{ maxHeight: 320 }}>
      {title && (
        <text x={chartWidth / 2} y="16" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="600">{title}</text>
      )}
      {yLabel && (
        <text x="8" y={chartHeight / 2 + 20} textAnchor="middle" className="fill-muted-foreground" fontSize="10" transform={`rotate(-90, 8, ${chartHeight / 2 + 20})`}>{yLabel}</text>
      )}

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = 30 + chartHeight * (1 - frac)
        return (
          <g key={frac}>
            <line x1="30" y1={y} x2={chartWidth - 10} y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />
            <text x="26" y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">
              {Math.round(maxValue * frac)}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0
        const x = 40 + i * (barWidth + 12)
        const y = 30 + chartHeight - barHeight

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="3"
              fill={getColor(i, d.color)}
              className="transition-all hover:opacity-80"
            />
            <text x={x + barWidth / 2} y={30 + chartHeight + 14} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
              {d.label.length > 8 ? d.label.slice(0, 7) + '...' : d.label}
            </text>
            {/* Value label on hover */}
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="500">
              {d.value}
            </text>
          </g>
        )
      })}

      {xLabel && (
        <text x={chartWidth / 2} y={chartHeight + 56} textAnchor="middle" className="fill-muted-foreground" fontSize="10">{xLabel}</text>
      )}
    </svg>
  )
}

// --- Line Chart ---
function LineChart({ data, title, yLabel, xLabel }: Omit<ChartData, 'type'>) {
  const maxValue = Math.max(...data.map(d => d.value))
  const chartHeight = 200
  const chartWidth = Math.max(400, data.length * 60)
  const padding = { top: 30, right: 20, bottom: 40, left: 40 }
  const innerW = chartWidth - padding.left - padding.right
  const innerH = chartHeight

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padding.top + innerH - (maxValue > 0 ? (d.value / maxValue) * innerH : 0),
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${padding.top + innerH} L ${points[0]?.x ?? 0} ${padding.top + innerH} Z`

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 80}`} className="w-full max-w-full" style={{ maxHeight: 320 }}>
      {title && (
        <text x={chartWidth / 2} y="16" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="600">{title}</text>
      )}

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padding.top + innerH * (1 - frac)
        return (
          <g key={frac}>
            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">
              {Math.round(maxValue * frac)}
            </text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={areaPath} fill="currentColor" className="text-primary/10" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="currentColor" className="text-primary" />
          <circle cx={p.x} cy={p.y} r="2" fill="white" />
          <text x={p.x} y={padding.top + innerH + 16} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
            {p.label}
          </text>
        </g>
      ))}

      {xLabel && (
        <text x={chartWidth / 2} y={chartHeight + 70} textAnchor="middle" className="fill-muted-foreground" fontSize="10">{xLabel}</text>
      )}
    </svg>
  )
}

// --- Pie Chart ---
function PieChart({ data, title }: Omit<ChartData, 'type'>) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const cx = 140, cy = 130, r = 90

  let cumAngle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const angle = total > 0 ? (d.value / total) * 2 * Math.PI : 0
    const startAngle = cumAngle
    cumAngle += angle
    const endAngle = cumAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = angle > Math.PI ? 1 : 0

    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: getColor(i, d.color),
      ...d,
      percentage: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }
  })

  return (
    <svg viewBox="0 0 400 280" className="w-full max-w-full" style={{ maxHeight: 300 }}>
      {title && (
        <text x="200" y="16" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="600">{title}</text>
      )}

      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} className="transition-all hover:opacity-80" stroke="white" strokeWidth="2" />
      ))}

      {/* Legend */}
      {slices.map((s, i) => (
        <g key={`legend-${i}`}>
          <rect x="290" y={30 + i * 22} width="10" height="10" rx="2" fill={s.color} />
          <text x="306" y={39 + i * 22} className="fill-foreground" fontSize="10">
            {s.label} ({s.percentage}%)
          </text>
        </g>
      ))}
    </svg>
  )
}

// --- Horizontal Bar Chart ---
function HorizontalBarChart({ data, title }: Omit<ChartData, 'type'>) {
  const maxValue = Math.max(...data.map(d => d.value))
  const barHeight = 28
  const chartHeight = data.length * (barHeight + 8) + 40

  return (
    <svg viewBox={`0 0 400 ${chartHeight}`} className="w-full max-w-full" style={{ maxHeight: 400 }}>
      {title && (
        <text x="200" y="16" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="600">{title}</text>
      )}

      {data.map((d, i) => {
        const barW = maxValue > 0 ? (d.value / maxValue) * 260 : 0
        const y = 30 + i * (barHeight + 8)

        return (
          <g key={i}>
            <text x="4" y={y + barHeight / 2 + 4} className="fill-foreground" fontSize="11">{d.label}</text>
            <rect x="100" y={y} width={barW} height={barHeight} rx="4" fill={getColor(i, d.color)} className="transition-all hover:opacity-80" />
            <text x={104 + barW} y={y + barHeight / 2 + 4} className="fill-muted-foreground" fontSize="10" fontWeight="500">
              {d.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// --- Main Renderer ---
export function ChartRenderer({ code, isIncomplete }: SVGRendererProps) {
  const chartData = useMemo<ChartData | null>(() => {
    try {
      return JSON.parse(code) as ChartData
    } catch {
      return null
    }
  }, [code])

  if (isIncomplete) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          Building chart...
        </div>
      </div>
    )
  }

  if (!chartData || !chartData.data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Invalid chart data. Expected JSON with type, data[].label, data[].value.
      </div>
    )
  }

  function handleDownload() {
    const svgEl = document.querySelector('.chart-container svg')
    if (!svgEl) return
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chartData?.title ?? 'chart'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ChartComponent = {
    bar: BarChart,
    line: LineChart,
    pie: PieChart,
    'horizontal-bar': HorizontalBarChart,
  }[chartData.type] ?? BarChart

  return (
    <div className="group relative rounded-xl border border-border bg-white dark:bg-card overflow-hidden">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Download SVG"
        >
          <DownloadIcon className="size-3.5" />
        </button>
      </div>
      <div className="chart-container p-6 flex items-center justify-center">
        <ChartComponent {...chartData} />
      </div>
    </div>
  )
}
