export interface ExternalProviderConfig {
  type: string
  baseUrl: string
  credentials: Record<string, string>
}

export interface ExternalProviderPort {
  connect(config: ExternalProviderConfig): Promise<void>
  query(endpoint: string, params: Record<string, unknown>): Promise<unknown>
  disconnect(): Promise<void>
}
