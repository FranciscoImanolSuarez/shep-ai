import type { McpServer } from '@/core/domain/entities/mcp-server'

export interface McpServerStorePort {
  findById(id: string): Promise<McpServer | null>
  findByWorkspace(workspaceId: string): Promise<McpServer[]>
  findEnabledByIds(ids: string[], workspaceId: string): Promise<McpServer[]>
  save(server: McpServer): Promise<McpServer>
  update(id: string, data: Partial<Omit<McpServer, 'id' | 'createdAt'>>): Promise<McpServer>
  delete(id: string): Promise<void>
}
