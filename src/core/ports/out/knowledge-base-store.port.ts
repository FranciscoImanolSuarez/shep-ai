import type { KnowledgeBase } from '@/core/domain/entities/knowledge-base'
import type { Document } from '@/core/domain/entities/document'

export interface KnowledgeBaseStorePort {
  insert(kb: KnowledgeBase): Promise<KnowledgeBase>
  listByUser(userId: string): Promise<KnowledgeBase[]>
  getByIdAndUser(id: string, userId: string): Promise<KnowledgeBase | null>
  update(id: string, data: Partial<Pick<KnowledgeBase, 'name' | 'description' | 'updatedAt'>>): Promise<KnowledgeBase>
  delete(id: string): Promise<void>
  /** Returns document metadata only — content is excluded for performance. */
  listDocumentsByKb(knowledgeBaseId: string): Promise<Document[]>
  /** Fetches the full text of a single document. */
  getDocumentContent(id: string): Promise<string | null>
  /** Returns the sum of content char lengths for all docs in a KB (single aggregate query). */
  getTotalContentChars(knowledgeBaseId: string): Promise<number>
}
