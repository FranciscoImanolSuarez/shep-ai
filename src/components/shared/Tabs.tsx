import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface TabItem {
  value: string
  label: string
  icon?: LucideIcon
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  items: TabItem[]
}

function TabsList({ value, onValueChange, items }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex items-end gap-0 border-b border-border overflow-x-auto"
    >
      {items.map((item) => {
        const isActive = item.value === value
        const Icon = item.icon

        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.value}`}
            id={`tab-${item.value}`}
            onClick={() => onValueChange(item.value)}
            className={`
              relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
              border-b-2 -mb-px
              ${isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }
            `}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

interface TabsContentProps {
  value: string
  current: string
  children: ReactNode
}

function TabsContent({ value, current, children }: TabsContentProps) {
  if (value !== current) return null
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
    >
      {children}
    </div>
  )
}

export const Tabs = Object.assign(TabsList, { Content: TabsContent })
