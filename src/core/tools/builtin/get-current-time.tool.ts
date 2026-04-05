import { z } from 'zod'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'

const inputSchema = z.object({
  timezone: z.string().optional().default('UTC').describe('IANA timezone (e.g. America/New_York)'),
})

type GetCurrentTimeInput = z.infer<typeof inputSchema>

export const getCurrentTimeTool: AgentToolDefinition<GetCurrentTimeInput> = {
  id: 'get-current-time',
  name: 'get-current-time',
  description: 'Get the current date and time. Useful when the user asks about the current time or needs time-based calculations.',
  category: 'builtin',
  type: 'function',
  parametersSchema: inputSchema,
  execute: async (input) => {
    const now = new Date()
    const formatted = now.toLocaleString('en-US', { timeZone: input.timezone })
    return {
      iso: now.toISOString(),
      formatted,
      timezone: input.timezone,
      timestamp: now.getTime(),
    }
  },
}
