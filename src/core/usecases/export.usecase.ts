import JSZip from 'jszip'
import type { ExporterPort, ExportFormat } from '@/core/ports/out/exporter.port'
import type { ConversationUseCase } from '@/core/usecases/conversation.usecase'

export class ExportOwnershipError extends Error {
  readonly conversationId: string

  constructor(conversationId: string) {
    super(`Conversation ${conversationId} does not belong to the requesting user`)
    this.name = 'ExportOwnershipError'
    this.conversationId = conversationId
  }
}

function slugify(title: string, fallback: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return slug || fallback
}

export class ExportUseCase {
  constructor(
    private readonly conversationUseCase: ConversationUseCase,
    private readonly exporters: Map<ExportFormat, ExporterPort>,
  ) {}

  private getExporter(format: ExportFormat): ExporterPort {
    const exporter = this.exporters.get(format)
    if (!exporter) {
      throw new Error(`Unsupported export format: ${format}`)
    }
    return exporter
  }

  async exportOne(opts: {
    userId: string
    conversationId: string
    format: ExportFormat
  }): Promise<{ data: Buffer | string; mimeType: string; extension: string; slug: string }> {
    const { userId, conversationId, format } = opts

    const conversation = await this.conversationUseCase.getConversation(conversationId, userId)
    if (!conversation) {
      throw new ExportOwnershipError(conversationId)
    }

    const messages = await this.conversationUseCase.listMessages(conversationId)
    const exporter = this.getExporter(format)
    const data = await exporter.serialize({ conversation, messages })
    const slug = slugify(conversation.title, conversationId)

    return {
      data,
      mimeType: exporter.mimeType,
      extension: exporter.extension,
      slug,
    }
  }

  async exportBatch(opts: {
    userId: string
    conversationIds: string[]
    format: ExportFormat
  }): Promise<Buffer> {
    const { userId, conversationIds, format } = opts
    const exporter = this.getExporter(format)

    const zip = new JSZip()

    await Promise.all(
      conversationIds.map(async (id) => {
        const conversation = await this.conversationUseCase.getConversation(id, userId)
        if (!conversation) {
          throw new ExportOwnershipError(id)
        }

        const messages = await this.conversationUseCase.listMessages(id)
        const data = await exporter.serialize({ conversation, messages })
        const slug = slugify(conversation.title, id)
        const filename = `${slug}.${exporter.extension}`

        zip.file(filename, data)
      }),
    )

    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    return buffer
  }
}
