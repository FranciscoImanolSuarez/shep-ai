interface SectionDividerProps {
  label: string
  align?: 'left' | 'center' | 'right'
}

export function SectionDivider({ label, align = 'center' }: SectionDividerProps) {
  if (align === 'left') {
    return (
      <div className="flex items-center gap-4 my-8">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }
  if (align === 'right') {
    return (
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
