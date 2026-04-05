import type { ExternalProviderPort, ExternalProviderConfig } from '@/core/ports/out/external-provider.port'

export abstract class BaseExternalProvider implements ExternalProviderPort {
  protected config: ExternalProviderConfig | null = null

  async connect(config: ExternalProviderConfig): Promise<void> {
    this.config = config
  }

  abstract query(endpoint: string, params: Record<string, unknown>): Promise<unknown>

  async disconnect(): Promise<void> {
    this.config = null
  }
}
