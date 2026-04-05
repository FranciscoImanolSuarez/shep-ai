import { z } from 'zod'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'

const inputSchema = z.object({
  query: z.string().describe('The search query'),
})

export const webSearchTool: AgentToolDefinition = {
  id: 'web-search',
  name: 'web-search',
  description:
    'Search the web for up-to-date information. Uses the native search capability of the AI provider (Anthropic or OpenAI). Not available for Ollama.',
  category: 'builtin',
  type: 'provider',
  parametersSchema: inputSchema,
}
