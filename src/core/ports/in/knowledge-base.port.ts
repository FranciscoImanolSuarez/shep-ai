import type { KnowledgeBase } from '@/core/domain/entities/knowledge-base'
import type { Document } from '@/core/domain/entities/document'

export interface CreateKnowledgeBaseInput {
  name: string
  description?: string
}

export interface UpdateKnowledgeBaseInput {
  name?: string
  description?: string
}

export interface KnowledgeBasePort {
  create(userId: string, input: CreateKnowledgeBaseInput): Promise<KnowledgeBase>
  list(userId: string): Promise<KnowledgeBase[]>
  get(userId: string, id: string): Promise<KnowledgeBase | null>
  update(userId: string, id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBase>
  delete(userId: string, id: string): Promise<void>
  listDocuments(userId: string, knowledgeBaseId: string): Promise<Document[]>
}
