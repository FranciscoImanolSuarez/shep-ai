import { jsPDF } from 'jspdf'
import type { ExporterPort, ExportPayload, ExportFormat } from '@/core/ports/out/exporter.port'

// NOTE: PDF output is plain text only — markdown formatting (bold, lists, code
// blocks) is intentionally NOT rendered. Headings use larger/bold fonts.
// jsPDF runs in Node via its node-specific bundle (dist/jspdf.node.min.js).

export class PdfExporter implements ExporterPort {
  readonly format: ExportFormat = 'pdf'
  readonly mimeType = 'application/pdf'
  readonly extension = 'pdf'

  async serialize({ conversation, messages }: ExportPayload): Promise<Buffer> {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    const maxWidth = pageWidth - margin * 2
    let y = margin

    const addText = (text: string, size: number, color: [number, number, number], bold = false): void => {
      doc.setFontSize(size)
      doc.setTextColor(...color)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')

      const lines = doc.splitTextToSize(text, maxWidth) as string[]
      const lineHeight = size * 0.4 // ~0.35mm per pt

      for (const line of lines) {
        if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(line, margin, y)
        y += lineHeight
      }
    }

    const gap = (mm: number) => {
      y += mm
    }

    // Title
    addText(conversation.title || 'Untitled conversation', 18, [20, 20, 20], true)
    gap(4)

    // Metadata block
    addText(`Model: ${conversation.model}`, 10, [100, 100, 100])
    addText(`RAG: ${conversation.useRag ? 'enabled' : 'disabled'}`, 10, [100, 100, 100])
    addText(`Created: ${conversation.createdAt.toISOString()}`, 10, [100, 100, 100])
    gap(6)

    // Separator line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    gap(5)

    // Messages
    for (const msg of messages) {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1)
      const timestamp = msg.createdAt.toISOString()

      // Role heading
      addText(`${role} — ${timestamp}`, 12, [40, 40, 40], true)
      gap(2)

      // Content
      addText(msg.content, 11, [30, 30, 30])
      gap(2)

      // Sources
      const sources = this.extractSources(msg)
      if (sources.length > 0) {
        addText('Sources:', 10, [80, 80, 80], true)
        for (const src of sources) {
          addText(`• ${src.title} — ${src.url}`, 10, [80, 80, 80])
        }
      }

      gap(4)
    }

    const arrayBuffer = doc.output('arraybuffer')
    return Buffer.from(arrayBuffer)
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
