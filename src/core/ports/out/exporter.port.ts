import type { Conversation, ConversationMessage } from '@/core/domain/entities/conversation'

export interface ExportPayload {
  conversation: Conversation
  messages: ConversationMessage[]
}

export type ExportFormat = 'md' | 'pdf' | 'json'

export interface ExporterPort {
  readonly format: ExportFormat
  readonly mimeType: string
  readonly extension: string
  serialize(payload: ExportPayload): Promise<Buffer | string>
}
