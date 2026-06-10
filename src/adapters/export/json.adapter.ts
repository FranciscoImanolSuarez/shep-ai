import type { ExporterPort, ExportPayload, ExportFormat } from '@/core/ports/out/exporter.port'

export class JsonExporter implements ExporterPort {
  readonly format: ExportFormat = 'json'
  readonly mimeType = 'application/json'
  readonly extension = 'json'

  async serialize({ conversation, messages }: ExportPayload): Promise<string> {
    return JSON.stringify({ conversation, messages }, null, 2)
  }
}
