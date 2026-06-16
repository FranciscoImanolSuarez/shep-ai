import type { UIMessage } from 'ai'

/**
 * Extracts plain text from an array of UIMessage parts.
 * Joins all `text` parts; non-text parts (tool calls, reasoning, etc.) are ignored.
 */
export function extractTextFromParts(
  parts: Array<{ type: string; text?: string } | Record<string, unknown>>,
): string {
  return (parts as Array<{ type: string; text?: string }>)
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
}

/**
 * Extracts the full text content from a UIMessage.
 * Falls back to the legacy `content` string field when parts are absent.
 */
export function uiMessageToText(message: UIMessage): string {
  if (message.parts && message.parts.length > 0) {
    return extractTextFromParts(message.parts as Array<{ type: string; text?: string }>)
  }
  return (message as unknown as { content?: string }).content ?? ''
}
