import { randomUUID } from 'crypto'
import type { AgentConfig, AgentProvider } from './agent'

export interface AgentConfigSnapshot {
  model: string
  provider: AgentProvider
  maxSteps: number
  temperature: number
  toolChoice: 'auto' | 'required' | 'none'
}

export interface PublishedAgent {
  id: string
  agentId: string
  publisherId: string
  name: string
  description: string
  category: string
  tags: string[]
  systemPromptSnapshot: string
  toolIdsSnapshot: string[]
  configSnapshot: AgentConfigSnapshot
  version: number
  installCount: number
  averageRating: number
  isPublic: boolean
  publishedAt: Date
  updatedAt: Date
}

export interface AgentInstall {
  id: string
  publishedAgentId: string
  installerId: string
  installedAgentId: string
  installedVersion: number
  latestVersion: number
  installedAt: Date
}

export interface AgentRating {
  id: string
  publishedAgentId: string
  raterId: string
  rating: number
  createdAt: Date
}

export type AgentCategory = 'general' | 'productivity' | 'research' | 'engineering' | 'creative'

export const AGENT_CATEGORIES: AgentCategory[] = [
  'general',
  'productivity',
  'research',
  'engineering',
  'creative',
]

export function createPublishedAgent(params: {
  agentId: string
  publisherId: string
  name: string
  description: string
  category: string
  tags: string[]
  systemPromptSnapshot: string
  toolIdsSnapshot: string[]
  configSnapshot: AgentConfigSnapshot
}): PublishedAgent {
  const now = new Date()
  return {
    id: randomUUID(),
    agentId: params.agentId,
    publisherId: params.publisherId,
    name: params.name,
    description: params.description,
    category: params.category,
    tags: params.tags,
    systemPromptSnapshot: params.systemPromptSnapshot,
    toolIdsSnapshot: params.toolIdsSnapshot,
    configSnapshot: params.configSnapshot,
    version: 1,
    installCount: 0,
    averageRating: 0,
    isPublic: true,
    publishedAt: now,
    updatedAt: now,
  }
}

export function createAgentInstall(params: {
  publishedAgentId: string
  installerId: string
  installedAgentId: string
  version: number
}): AgentInstall {
  return {
    id: randomUUID(),
    publishedAgentId: params.publishedAgentId,
    installerId: params.installerId,
    installedAgentId: params.installedAgentId,
    installedVersion: params.version,
    latestVersion: params.version,
    installedAt: new Date(),
  }
}

export function createAgentRating(params: {
  publishedAgentId: string
  raterId: string
  rating: number
}): AgentRating {
  return {
    id: randomUUID(),
    publishedAgentId: params.publishedAgentId,
    raterId: params.raterId,
    rating: params.rating,
    createdAt: new Date(),
  }
}
