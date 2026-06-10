import type { ReactNode } from 'react'

interface HeroStat {
  label: string
  value: string | number
  hint?: string
}

interface HeroProps {
  eyebrow?: string
  title: string
  accent?: string
  description?: string
  actions?: ReactNode
  stats?: HeroStat[]
  variant?: 'default' | 'gradient' | 'pattern' | 'both'
  align?: 'left' | 'center'
  children?: ReactNode
}

export function Hero({
  eyebrow,
  title,
  accent,
  description,
  actions,
  stats,
  variant = 'default',
  align = 'left',
  children,
}: HeroProps) {
  const showGradient = variant === 'gradient' || variant === 'both'
  const showPattern = variant === 'pattern' || variant === 'both'

  const renderTitle = () => {
    if (!accent) return title
    const idx = title.indexOf(accent)
    if (idx === -1) return title
    return (
      <>
        {title.slice(0, idx)}
        <span className="text-primary">{accent}</span>
        {title.slice(idx + accent.length)}
      </>
    )
  }

  return (
    <section
      className={`relative overflow-hidden border-b border-border ${align === 'center' ? 'text-center' : ''}`}
    >
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
      )}
      {showPattern && (
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )}
      <div
        className={`relative px-6 sm:px-8 py-12 sm:py-16 max-w-7xl mx-auto ${align === 'center' ? 'flex flex-col items-center' : ''}`}
      >
        {eyebrow && (
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-4">
            {eyebrow}
          </p>
        )}
        <div
          className={`flex items-start ${align === 'center' ? 'flex-col items-center' : 'sm:items-end'} justify-between gap-4 sm:gap-6 flex-wrap`}
        >
          <div className={align === 'center' ? 'max-w-2xl' : 'flex-1 min-w-0'}>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              {renderTitle()}
            </h1>
            {description && (
              <p
                className={`mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed ${align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-2xl'}`}
              >
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div
            className={`flex flex-wrap items-start gap-6 sm:gap-8 mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-border ${align === 'center' ? 'justify-center' : ''}`}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                  {stat.label}
                </p>
                <p className="text-xl sm:text-2xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                {stat.hint && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.hint}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
