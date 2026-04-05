import { z } from 'zod'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import type { RagPort } from '@/core/ports/in/rag.port'

const inputSchema = z.object({
  query: z.string().describe('The search query to find relevant documents'),
  topK: z.number().optional().default(5).describe('Number of results to return'),
})

type RagSearchInput = z.infer<typeof inputSchema>

export function createRagSearchTool(ragPort: RagPort): AgentToolDefinition<RagSearchInput> {
  return {
    id: 'rag-search',
    name: 'rag-search',
    description: 'Search through uploaded documents to find relevant information. Use this when the user asks questions that might be answered by the available documents.',
    category: 'builtin',
    type: 'function',
    parametersSchema: inputSchema,
    execute: async (input) => {
      const result = await ragPort.query({
        query: input.query,
        topK: input.topK,
      })
      return {
        answer: result.answer,
        sources: result.sources.map((s) => ({
          content: s.content,
          metadata: s.metadata,
        })),
      }
    },
  }
}
