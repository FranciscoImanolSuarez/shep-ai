import type { PublishedAgent, AgentInstall, AgentRating } from '@/core/domain/entities/published-agent'

export interface PublishInput {
  userEmail: string
  agentId: string
  category: string
  tags: string[]
  description?: string
}

export interface BrowseFilters {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export interface InstallInput {
  userEmail: string
  pubId: string
}

export interface PushUpdateInput {
  userEmail: string
  pubId: string
}

export interface RateInput {
  userEmail: string
  pubId: string
  rating: number
}

export interface UnpublishInput {
  userEmail: string
  pubId: string
}

export interface MarketplacePort {
  publish(input: PublishInput): Promise<PublishedAgent>
  browse(filters: BrowseFilters): Promise<PublishedAgent[]>
  getDetail(pubId: string): Promise<PublishedAgent | null>
  install(input: InstallInput): Promise<AgentInstall>
  pushUpdate(input: PushUpdateInput): Promise<PublishedAgent>
  unpublish(input: UnpublishInput): Promise<void>
  rate(input: RateInput): Promise<AgentRating>
  listMine(userEmail: string): Promise<PublishedAgent[]>
  getInstall(publishedAgentId: string, installerId: string): Promise<AgentInstall | null>
}
