interface KeyboardShortcutProps {
  keys: string[]
}

export function KeyboardShortcut({ keys }: KeyboardShortcutProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && (
            <span className="text-[9px] text-muted-foreground select-none">+</span>
          )}
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground leading-none">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  )
}
