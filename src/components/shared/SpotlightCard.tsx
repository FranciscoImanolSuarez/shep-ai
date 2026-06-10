import type { ReactNode } from 'react'

interface SpotlightCardProps {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
  image?: ReactNode
  variant?: 'default' | 'gradient'
}

export function SpotlightCard({
  eyebrow,
  title,
  description,
  action,
  image,
  variant = 'default',
}: SpotlightCardProps) {
  const showGradient = variant === 'gradient'
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border ${showGradient ? '' : 'bg-card'}`}
    >
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
      )}
      <div className="relative p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          {eyebrow && (
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              {eyebrow}
            </p>
          )}
          <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          {action && <div className="mt-5">{action}</div>}
        </div>
        {image && <div className="flex justify-center">{image}</div>}
      </div>
    </div>
  )
}
