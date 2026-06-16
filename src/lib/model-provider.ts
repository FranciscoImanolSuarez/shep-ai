export type Provider = 'openai' | 'anthropic' | 'ollama'

/**
 * Parse a model string into a provider + short name.
 *
 * Handles:
 *  - slash-prefixed: "openai/gpt-4o", "anthropic/claude-3-5-sonnet"
 *  - well-known prefixes: gpt→openai, claude→anthropic, llama/mistral→ollama
 *  - unknown bare string: falls back to { provider: 'openai', name: model }
 *    (mirrors the original chat-interface / MessageBubble behavior)
 *
 * conversations-grid used `return null` as the final fallback instead of the
 * openai fallback — preserve that per-call-site via the `strict` flag.
 */
export function parseProvider(
  model?: string,
  options: { strict?: boolean } = {},
): { provider: Provider; name: string } | null {
  if (!model) return null
  if (model.includes('/')) {
    const [p, ...rest] = model.split('/')
    const lower = p.toLowerCase()
    if (lower === 'openai' || lower === 'anthropic' || lower === 'ollama') {
      return { provider: lower as Provider, name: rest.join('/') }
    }
  }
  if (model.startsWith('gpt')) return { provider: 'openai', name: model }
  if (model.startsWith('claude')) return { provider: 'anthropic', name: model }
  if (model.startsWith('llama') || model.startsWith('mistral')) {
    return { provider: 'ollama', name: model }
  }
  // conversations-grid originally returned null for unrecognised bare strings;
  // chat-interface and MessageBubble fell back to openai.
  if (options.strict) return null
  return { provider: 'openai', name: model }
}

/** Dot / pill colour for the floating model badge and assistant bubble footer */
export const PROVIDER_DOT: Record<Provider, string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  ollama: 'bg-violet-500',
}

/** Background + text + border chip colour used in the conversations grid */
export const PROVIDER_BG: Record<Provider, string> = {
  openai: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  anthropic: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
  ollama: 'bg-violet-500/15 text-violet-600 border-violet-500/20',
}

/** Single-letter initial rendered inside the provider avatar square */
export const PROVIDER_INITIAL: Record<Provider, string> = {
  openai: 'O',
  anthropic: 'A',
  ollama: 'L',
}
