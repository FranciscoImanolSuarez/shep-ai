import { BotIcon } from 'lucide-react'

type Provider = 'openai' | 'anthropic' | 'ollama'
type AvatarSize = 'sm' | 'md' | 'lg'

interface AgentAvatarProps {
  name: string
  provider?: Provider
  size?: AvatarSize
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-12',
}

const ICON_SIZES: Record<AvatarSize, string> = {
  sm: 'size-3.5',
  md: 'size-4.5',
  lg: 'size-6',
}

const PROVIDER_BG: Record<Provider, string> = {
  openai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ollama: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

const DEFAULT_BG = 'bg-primary/10 text-primary'

export function AgentAvatar({ name, provider, size = 'md' }: AgentAvatarProps) {
  const bg = provider ? PROVIDER_BG[provider] : DEFAULT_BG

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-md shrink-0 flex items-center justify-center ${bg}`}
      title={name}
      aria-label={name}
    >
      <BotIcon className={ICON_SIZES[size]} />
    </div>
  )
}
