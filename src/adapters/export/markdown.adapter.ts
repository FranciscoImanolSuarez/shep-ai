import type { ExporterPort, ExportPayload, ExportFormat } from '@/core/ports/out/exporter.port'

export class MarkdownExporter implements ExporterPort {
  readonly format: ExportFormat = 'md'
  readonly mimeType = 'text/markdown; charset=utf-8'
  readonly extension = 'md'

  async serialize({ conversation, messages }: ExportPayload): Promise<string> {
    const lines: string[] = []

    // Title + metadata
    lines.push(`# ${conversation.title || 'Untitled conversation'}`)
    lines.push('')
    lines.push(`- **Model**: ${conversation.model}`)
    lines.push(`- **RAG**: ${conversation.useRag ? 'enabled' : 'disabled'}`)
    lines.push(`- **Created**: ${conversation.createdAt.toISOString()}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Messages
    for (const msg of messages) {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1)
      const timestamp = msg.createdAt.toISOString()
      lines.push(`## ${role} — ${timestamp}`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')

      // RAG sources stored in metadata
      const sources = this.extractSources(msg)
      if (sources.length > 0) {
        lines.push('### Sources')
        for (const src of sources) {
          lines.push(`- ${src.title} — ${src.url}`)
        }
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  private extractSources(msg: { metadata: Record<string, unknown> }): Array<{ title: string; url: string }> {
    const raw = msg.metadata?.sources
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (s): s is { title: string; url: string } =>
        typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).title === 'string' && typeof (s as Record<string, unknown>).url === 'string',
    )
  }
}
