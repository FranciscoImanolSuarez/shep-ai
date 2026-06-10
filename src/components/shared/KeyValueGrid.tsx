interface KeyValueItem {
  label: string
  value: string | number
  mono?: boolean
}

interface KeyValueGridProps {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3
}

const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

export function KeyValueGrid({ items, columns = 3 }: KeyValueGridProps) {
  return (
    <div className={`grid gap-4 ${COLS[columns]}`}>
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {item.label}
          </p>
          <p className={`text-sm ${item.mono ? 'font-mono' : ''}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
