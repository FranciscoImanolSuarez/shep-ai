import { createKnowledgeBase } from '@/core/domain/entities/knowledge-base'
import type { KnowledgeBase } from '@/core/domain/entities/knowledge-base'
import type { Document } from '@/core/domain/entities/document'
import type { KnowledgeBasePort, CreateKnowledgeBaseInput, UpdateKnowledgeBaseInput } from '@/core/ports/in/knowledge-base.port'
import type { KnowledgeBaseStorePort } from '@/core/ports/out/knowledge-base-store.port'

export class KnowledgeBaseUseCase implements KnowledgeBasePort {
  constructor(private readonly store: KnowledgeBaseStorePort) {}

  async create(userId: string, input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
    const kb = createKnowledgeBase({ userId, name: input.name, description: input.description })
    return this.store.insert(kb)
  }

  async list(userId: string): Promise<KnowledgeBase[]> {
    return this.store.listByUser(userId)
  }

  async get(userId: string, id: string): Promise<KnowledgeBase | null> {
    return this.store.getByIdAndUser(id, userId)
  }

  async update(userId: string, id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBase> {
    const existing = await this.store.getByIdAndUser(id, userId)
    if (!existing) throw new Error(`Knowledge base not found: ${id}`)

    const data: Partial<Pick<KnowledgeBase, 'name' | 'description' | 'updatedAt'>> = {
      updatedAt: new Date(),
    }
    if (input.name !== undefined) data.name = input.name
    if (input.description !== undefined) data.description = input.description

    return this.store.update(id, data)
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.store.getByIdAndUser(id, userId)
    if (!existing) throw new Error(`Knowledge base not found: ${id}`)
    return this.store.delete(id)
  }

  async listDocuments(userId: string, knowledgeBaseId: string): Promise<Document[]> {
    const existing = await this.store.getByIdAndUser(knowledgeBaseId, userId)
    if (!existing) throw new Error(`Knowledge base not found: ${knowledgeBaseId}`)
    return this.store.listDocumentsByKb(knowledgeBaseId)
  }
}
