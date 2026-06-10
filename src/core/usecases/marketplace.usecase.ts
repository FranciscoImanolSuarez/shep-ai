import type { PublishedAgent, AgentInstall, AgentRating } from '@/core/domain/entities/published-agent'
import { createPublishedAgent, createAgentInstall, createAgentRating } from '@/core/domain/entities/published-agent'
import type { MarketplacePort, PublishInput, BrowseFilters, InstallInput, PushUpdateInput, RateInput, UnpublishInput } from '@/core/ports/in/marketplace.port'
import type { MarketplaceStorePort } from '@/core/ports/out/marketplace-store.port'
import type { AgentPort } from '@/core/ports/in/agent.port'

export class MarketplaceUseCase implements MarketplacePort {
  constructor(
    private readonly store: MarketplaceStorePort,
    private readonly agentUseCase: AgentPort,
  ) {}

  async publish(input: PublishInput): Promise<PublishedAgent> {
    const agent = await this.agentUseCase.getAgent(input.agentId)
    if (!agent) throw new Error(`Agent not found: ${input.agentId}`)

    const published = createPublishedAgent({
      agentId: agent.id,
      publisherId: input.userEmail,
      name: agent.name,
      description: input.description ?? agent.description,
      category: input.category,
      tags: input.tags,
      systemPromptSnapshot: agent.systemPrompt,
      toolIdsSnapshot: agent.toolIds,
      configSnapshot: {
        model: agent.model,
        provider: agent.provider,
        maxSteps: agent.config.maxSteps,
        temperature: agent.config.temperature,
        toolChoice: agent.config.toolChoice,
      },
    })

    return this.store.insertPublished(published)
  }

  async browse(filters: BrowseFilters): Promise<PublishedAgent[]> {
    return this.store.listPublic(filters)
  }

  async getDetail(pubId: string): Promise<PublishedAgent | null> {
    return this.store.getById(pubId)
  }

  async install(input: InstallInput): Promise<AgentInstall> {
    const published = await this.store.getById(input.pubId)
    if (!published) throw new Error(`Published agent not found: ${input.pubId}`)

    // Check for duplicate install
    const existing = await this.store.getInstall(input.pubId, input.userEmail)
    if (existing) throw Object.assign(new Error('Already installed'), { code: 'ALREADY_INSTALLED' })

    // Create a new agent for the installer from the snapshot
    const newAgent = await this.agentUseCase.createAgent({
      name: published.name,
      description: published.description,
      systemPrompt: published.systemPromptSnapshot,
      model: published.configSnapshot.model,
      provider: published.configSnapshot.provider as 'openai' | 'anthropic' | 'ollama',
      toolIds: published.toolIdsSnapshot,
      config: {
        maxSteps: published.configSnapshot.maxSteps,
        temperature: published.configSnapshot.temperature,
        toolChoice: published.configSnapshot.toolChoice as 'auto' | 'required' | 'none',
      },
    })

    const install = createAgentInstall({
      publishedAgentId: input.pubId,
      installerId: input.userEmail,
      installedAgentId: newAgent.id,
      version: published.version,
    })

    const savedInstall = await this.store.insertInstall(install)

    // Atomic increment
    await this.store.incrementInstallCount(input.pubId)

    return savedInstall
  }

  async pushUpdate(input: PushUpdateInput): Promise<PublishedAgent> {
    const published = await this.store.getById(input.pubId)
    if (!published) throw new Error(`Published agent not found: ${input.pubId}`)
    if (published.publisherId !== input.userEmail) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' })

    // Load source agent and re-snapshot
    const agent = await this.agentUseCase.getAgent(published.agentId)
    if (!agent) throw new Error(`Source agent not found: ${published.agentId}`)

    const newVersion = published.version + 1
    const now = new Date()

    const updated = await this.store.updatePublished(input.pubId, {
      systemPromptSnapshot: agent.systemPrompt,
      toolIdsSnapshot: agent.toolIds,
      configSnapshot: {
        model: agent.model,
        provider: agent.provider,
        maxSteps: agent.config.maxSteps,
        temperature: agent.config.temperature,
        toolChoice: agent.config.toolChoice,
      },
      version: newVersion,
      updatedAt: now,
    })

    // Update latestVersion on all installs
    await this.store.updateInstallsLatestVersion(input.pubId, newVersion)

    return updated
  }

  async unpublish(input: UnpublishInput): Promise<void> {
    const published = await this.store.getById(input.pubId)
    if (!published) throw new Error(`Published agent not found: ${input.pubId}`)
    if (published.publisherId !== input.userEmail) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' })

    await this.store.updatePublished(input.pubId, { isPublic: false, updatedAt: new Date() })
  }

  async rate(input: RateInput): Promise<AgentRating> {
    if (input.rating < 1 || input.rating > 5) throw new Error('Rating must be between 1 and 5')

    const published = await this.store.getById(input.pubId)
    if (!published) throw new Error(`Published agent not found: ${input.pubId}`)

    const existing = await this.store.getRating(input.pubId, input.userEmail)
    if (existing) throw Object.assign(new Error('Already rated'), { code: 'ALREADY_RATED' })

    const ratingObj = createAgentRating({
      publishedAgentId: input.pubId,
      raterId: input.userEmail,
      rating: input.rating,
    })

    const saved = await this.store.insertRating(ratingObj)

    // Recompute average
    await this.store.recomputeAverageRating(input.pubId)

    return saved
  }

  async listMine(userEmail: string): Promise<PublishedAgent[]> {
    return this.store.listByPublisher(userEmail)
  }

  async getInstall(publishedAgentId: string, installerId: string): Promise<AgentInstall | null> {
    return this.store.getInstall(publishedAgentId, installerId)
  }
}
