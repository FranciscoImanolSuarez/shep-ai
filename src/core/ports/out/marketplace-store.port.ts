import type { PublishedAgent, AgentInstall, AgentRating } from '@/core/domain/entities/published-agent'

export interface BrowseFilters {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export interface MarketplaceStorePort {
  // Published agents
  insertPublished(agent: PublishedAgent): Promise<PublishedAgent>
  listPublic(filters: BrowseFilters): Promise<PublishedAgent[]>
  getById(id: string): Promise<PublishedAgent | null>
  updatePublished(id: string, data: Partial<Omit<PublishedAgent, 'id' | 'publishedAt'>>): Promise<PublishedAgent>
  deletePublished(id: string): Promise<void>
  listByPublisher(publisherId: string): Promise<PublishedAgent[]>
  incrementInstallCount(id: string): Promise<void>

  // Installs
  insertInstall(install: AgentInstall): Promise<AgentInstall>
  getInstall(publishedAgentId: string, installerId: string): Promise<AgentInstall | null>
  listInstallsByPublished(publishedAgentId: string): Promise<AgentInstall[]>
  updateInstallsLatestVersion(publishedAgentId: string, latestVersion: number): Promise<void>

  // Ratings
  insertRating(rating: AgentRating): Promise<AgentRating>
  getRating(publishedAgentId: string, raterId: string): Promise<AgentRating | null>
  recomputeAverageRating(publishedAgentId: string): Promise<number>
}
