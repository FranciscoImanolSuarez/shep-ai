'use client'

import { useState } from 'react'

interface HeatMapProps {
  data: { date: string; value: number }[]
  maxValue?: number
  weeks?: number
  cellSize?: number
}

function getIntensityClass(value: number, max: number): string {
  if (value === 0) return 'bg-muted'
  const ratio = value / max
  if (ratio < 0.2) return 'bg-primary/20'
  if (ratio < 0.4) return 'bg-primary/40'
  if (ratio < 0.6) return 'bg-primary/60'
  if (ratio < 0.8) return 'bg-primary/80'
  return 'bg-primary'
}

export function HeatMap({
  data,
  maxValue,
  weeks = 12,
  cellSize = 12,
}: HeatMapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; value: number; x: number; y: number } | null>(null)

  // Build a lookup map
  const dataMap = new Map(data.map((d) => [d.date, d.value]))
  const effectiveMax = maxValue ?? Math.max(...data.map((d) => d.value), 1)

  // Build grid: 7 rows (Mon–Sun), weeks columns
  // Fill from today backwards
  const today = new Date()
  const cells: { date: string; value: number }[][] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const col: { date: string; value: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() - w * 7 - (6 - d))
      const key = date.toISOString().slice(0, 10)
      col.push({ date: key, value: dataMap.get(key) ?? 0 })
    }
    cells.push(col)
  }

  const gap = 2
  const stride = cellSize + gap

  return (
    <div className="relative inline-block">
      <svg
        width={weeks * stride - gap}
        height={7 * stride - gap}
        aria-label="Activity heatmap"
      >
        {cells.map((col, wi) =>
          col.map((cell, di) => (
            <rect
              key={`${wi}-${di}`}
              x={wi * stride}
              y={di * stride}
              width={cellSize}
              height={cellSize}
              rx={2}
              className={`${getIntensityClass(cell.value, effectiveMax)} transition-opacity cursor-default`}
              onMouseEnter={(e) => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect()
                setTooltip({ date: cell.date, value: cell.value, x: rect.x, y: rect.y })
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))
        )}
      </svg>
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 rounded-md bg-card border border-border text-xs shadow-lg"
          style={{ top: tooltip.y - 36, left: tooltip.x }}
        >
          <span className="font-mono">{tooltip.date}</span>
          <span className="ml-2 font-semibold">{tooltip.value}</span>
        </div>
      )}
    </div>
  )
}
