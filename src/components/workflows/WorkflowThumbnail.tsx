import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

const NODE_COLORS: Record<string, string> = {
  input: 'oklch(0.65 0.18 145)',    // green
  output: 'oklch(0.7 0.18 50)',     // orange
  agent: 'oklch(0.6 0.22 250)',     // brand blue
  condition: 'oklch(0.55 0.22 290)', // violet
}

interface Props {
  definition: WorkflowDefinition
  width?: number
  height?: number
}

export function WorkflowThumbnail({ definition, width = 120, height = 80 }: Props) {
  const nodes = definition?.nodes ?? []
  const edges = definition?.edges ?? []

  if (nodes.length === 0) {
    return (
      <div
        className="rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground"
        style={{ width, height }}
      >
        empty
      </div>
    )
  }

  const xs = nodes.map((n) => n.position.x)
  const ys = nodes.map((n) => n.position.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padding = 8
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)

  const sx = (x: number) => padding + ((x - minX) / w) * (width - padding * 2)
  const sy = (y: number) => padding + ((y - minY) / h) * (height - padding * 2)

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <svg width={width} height={height} className="rounded-md bg-muted">
      {edges.map((e, i) => {
        const src = nodeById.get(e.source)
        const tgt = nodeById.get(e.target)
        if (!src || !tgt) return null
        return (
          <line
            key={i}
            x1={sx(src.position.x)}
            y1={sy(src.position.y)}
            x2={sx(tgt.position.x)}
            y2={sy(tgt.position.y)}
            stroke="oklch(0.6 0 0)"
            strokeWidth="1"
            opacity="0.5"
          />
        )
      })}
      {nodes.map((n) => (
        <circle
          key={n.id}
          cx={sx(n.position.x)}
          cy={sy(n.position.y)}
          r="4"
          fill={NODE_COLORS[n.type] ?? 'oklch(0.5 0 0)'}
        />
      ))}
    </svg>
  )
}
