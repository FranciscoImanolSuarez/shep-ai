import { randomUUID } from 'crypto'

export interface KnowledgeBase {
  id: string
  userId: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  documentCount?: number
}

export interface CreateKnowledgeBaseInput {
  userId: string
  name: string
  description?: string
}

export function createKnowledgeBase(input: CreateKnowledgeBaseInput): KnowledgeBase {
  const now = new Date()
  return {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    description: input.description ?? '',
    createdAt: now,
    updatedAt: now,
  }
}
