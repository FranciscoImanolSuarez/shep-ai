import type { KnowledgeBase } from '@/core/domain/entities/knowledge-base'
import type { Document } from '@/core/domain/entities/document'

export interface KnowledgeBaseStorePort {
  insert(kb: KnowledgeBase): Promise<KnowledgeBase>
  listByUser(userId: string): Promise<KnowledgeBase[]>
  getByIdAndUser(id: string, userId: string): Promise<KnowledgeBase | null>
  update(id: string, data: Partial<Pick<KnowledgeBase, 'name' | 'description' | 'updatedAt'>>): Promise<KnowledgeBase>
  delete(id: string): Promise<void>
  listDocumentsByKb(knowledgeBaseId: string): Promise<Document[]>
}
