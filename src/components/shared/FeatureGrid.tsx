import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface FeatureItem {
  icon?: LucideIcon
  title: string
  description: string
  metric?: { value: string | number; label: string }
  href?: string
}

interface FeatureGridProps {
  items: FeatureItem[]
  columns?: 2 | 3 | 4
}

const COLUMN_CLASSES = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
} as const

export function FeatureGrid({ items, columns = 3 }: FeatureGridProps) {
  return (
    <div className={`grid ${COLUMN_CLASSES[columns]} gap-4`}>
      {items.map((item, i) => {
        const Icon = item.icon
        const content = (
          <div className="h-full rounded-xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors flex flex-col">
            {Icon && (
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Icon className="size-4" />
              </div>
            )}
            <h3 className="text-sm font-semibold tracking-tight">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed flex-1">
              {item.description}
            </p>
            {item.metric && (
              <div className="mt-3 pt-3 border-t border-border flex items-baseline gap-1.5">
                <span className="text-xl font-semibold tabular-nums">
                  {item.metric.value}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {item.metric.label}
                </span>
              </div>
            )}
          </div>
        )
        return item.href ? (
          <Link key={i} href={item.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={i}>{content}</div>
        )
      })}
    </div>
  )
}
