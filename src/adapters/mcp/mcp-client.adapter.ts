import { createMCPClient } from '@ai-sdk/mcp'
import { z } from 'zod'
import type { McpServer } from '@/core/domain/entities/mcp-server'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'

export interface LoadedMcpBundle {
  /** AgentToolDefinitions ready to merge into resolveTools output. */
  tools: AgentToolDefinition[]
  /** Closes the underlying MCP client. Must be called after the agent run completes. */
  close: () => Promise<void>
}

/**
 * P0.3 — Loads tools from a configured MCP server.
 *
 * The returned `tools` use `sdkTool` bypass so the runner does NOT re-wrap them
 * via `tool({...})` — preserving the MCP execute signature that takes extra
 * options from the AI SDK.
 *
 * Each tool's id is prefixed with `mcp:<serverId>:<toolName>` to keep ids
 * unique across multiple servers attached to the same agent.
 *
 * Callers MUST invoke `close()` after the agent run finishes (try/finally) to
 * release the underlying HTTP connection.
 */
export async function loadMcpBundle(server: McpServer): Promise<LoadedMcpBundle> {
  const client = await createMCPClient({
    transport: {
      type: server.transportType,
      url: server.url,
      headers: server.authToken ? { Authorization: `Bearer ${server.authToken}` } : undefined,
    },
  })

  const mcpToolSet = await client.tools()

  const tools: AgentToolDefinition[] = Object.entries(mcpToolSet).map(([toolName, sdkTool]) => {
    // The MCP tool entry shape is { description?, inputSchema, execute, ... }
    const description = (sdkTool as { description?: string }).description ?? ''

    return {
      id: `mcp:${server.id}:${toolName}`,
      name: toolName,
      description,
      category: 'external' as const,
      type: 'mcp' as const,
      // The actual schema lives on `sdkTool.inputSchema` and the SDK runtime
      // uses it directly via the bypass. The placeholder here satisfies the
      // domain type without leaking SDK internals.
      parametersSchema: z.unknown() as unknown as AgentToolDefinition['parametersSchema'],
      sdkTool,
    }
  })

  return {
    tools,
    close: async () => {
      try {
        await client.close()
      } catch {
        // Best-effort: a transport already torn down should not break the run
      }
    },
  }
}
