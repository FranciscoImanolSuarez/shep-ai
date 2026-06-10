import { Loader2Icon } from 'lucide-react'

type SpinnerVariant = 'default' | 'dots' | 'pulse'
type SpinnerSize = 'sm' | 'default' | 'lg'

const SIZE_MAP: Record<SpinnerSize, string> = {
  sm: 'size-3',
  default: 'size-4',
  lg: 'size-6',
}

interface SpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
}

export function Spinner({ size = 'default', variant = 'default', className = '' }: SpinnerProps) {
  if (variant === 'dots') {
    const dotSize = size === 'sm' ? 'size-1' : size === 'lg' ? 'size-2.5' : 'size-1.5'
    return (
      <span className={`inline-flex items-center gap-1 ${className}`} aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${dotSize} rounded-full bg-muted-foreground animate-bounce`}
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </span>
    )
  }

  if (variant === 'pulse') {
    const pulseSize = SIZE_MAP[size]
    return (
      <span
        className={`${pulseSize} rounded-full bg-primary animate-pulse inline-block ${className}`}
        aria-label="Loading"
      />
    )
  }

  return (
    <Loader2Icon
      className={`${SIZE_MAP[size]} animate-spin text-muted-foreground ${className}`}
      aria-label="Loading"
    />
  )
}
