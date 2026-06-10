export type McpTransportType = 'http' | 'sse'

export interface McpServer {
  id: string
  workspaceId: string
  name: string
  transportType: McpTransportType
  url: string
  authToken?: string | null
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}
