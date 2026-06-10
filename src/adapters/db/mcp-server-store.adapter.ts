import { eq, and, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { McpServerStorePort } from '@/core/ports/out/mcp-server-store.port'
import type { McpServer } from '@/core/domain/entities/mcp-server'
import { encryptToken, decryptToken } from '@/lib/token-cipher'
import { mcpServers } from './schema'
import type { Database } from './connection'

type McpServerRow = typeof mcpServers.$inferSelect

function toDomain(row: McpServerRow): McpServer {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    transportType: row.transportType,
    url: row.url,
    authToken: row.authToken ? decryptToken(row.authToken) : row.authToken,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class McpServerStoreAdapter implements McpServerStorePort {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<McpServer | null> {
    const [row] = await this.db.select().from(mcpServers).where(eq(mcpServers.id, id))
    return row ? toDomain(row) : null
  }

  async findByWorkspace(workspaceId: string): Promise<McpServer[]> {
    const rows = await this.db.select().from(mcpServers).where(eq(mcpServers.workspaceId, workspaceId))
    return rows.map(toDomain)
  }

  async findEnabledByIds(ids: string[], workspaceId: string): Promise<McpServer[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(mcpServers)
      .where(and(
        inArray(mcpServers.id, ids),
        eq(mcpServers.workspaceId, workspaceId),
        eq(mcpServers.enabled, true),
      ))
    return rows.map(toDomain)
  }

  async save(server: McpServer): Promise<McpServer> {
    const [row] = await this.db.insert(mcpServers).values({
      id: server.id ?? randomUUID(),
      workspaceId: server.workspaceId,
      name: server.name,
      transportType: server.transportType,
      url: server.url,
      authToken: server.authToken ? encryptToken(server.authToken) : null,
      enabled: server.enabled,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    }).returning()
    return toDomain(row)
  }

  async update(id: string, data: Partial<Omit<McpServer, 'id' | 'createdAt'>>): Promise<McpServer> {
    const values: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) values.name = data.name
    if (data.transportType !== undefined) values.transportType = data.transportType
    if (data.url !== undefined) values.url = data.url
    if (data.authToken !== undefined) values.authToken = data.authToken ? encryptToken(data.authToken) : data.authToken
    if (data.enabled !== undefined) values.enabled = data.enabled

    const [row] = await this.db.update(mcpServers).set(values).where(eq(mcpServers.id, id)).returning()
    if (!row) throw new Error(`MCP server not found: ${id}`)
    return toDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(mcpServers).where(eq(mcpServers.id, id))
  }
}
