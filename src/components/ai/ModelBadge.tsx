type Provider = 'openai' | 'anthropic' | 'ollama'

interface ModelBadgeProps {
  provider: Provider
  model: string
}

const PROVIDER_DOT: Record<Provider, string> = {
  openai: 'bg-green-500',
  anthropic: 'bg-orange-500',
  ollama: 'bg-violet-500',
}

const PROVIDER_LABEL: Record<Provider, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  ollama: 'ollama',
}

export function ModelBadge({ provider, model }: ModelBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5">
      <span className={`size-1.5 rounded-full shrink-0 ${PROVIDER_DOT[provider]}`} />
      <span className="text-xs font-mono text-muted-foreground">
        {PROVIDER_LABEL[provider]}/{model}
      </span>
    </span>
  )
}
