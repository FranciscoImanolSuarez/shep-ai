interface SectionDividerProps {
  label: string
  align?: 'left' | 'center' | 'right'
  /** Override the default `my-8` spacing, e.g. `my-0` inside a `space-y-6` PageBody. */
  className?: string
}

export function SectionDivider({ label, align = 'center', className = 'my-8' }: SectionDividerProps) {
  const text = (
    <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
      {label}
    </span>
  )
  const line = <div className="flex-1 h-px bg-border" />

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {align !== 'left' && line}
      {text}
      {align !== 'right' && line}
    </div>
  )
}
