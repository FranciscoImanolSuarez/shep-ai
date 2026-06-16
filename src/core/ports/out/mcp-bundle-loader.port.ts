import type { McpServer } from '@/core/domain/entities/mcp-server'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'

/**
 * Port for loading MCP tool bundles from a configured server.
 * `McpClientAdapter` implements this by wrapping `loadMcpBundle`.
 */
export interface McpBundleLoaderPort {
  loadBundle(server: McpServer): Promise<{
    tools: AgentToolDefinition[]
    close: () => Promise<void>
  }>
}
