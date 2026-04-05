import type { z } from 'zod'

export type ToolCategory = 'builtin' | 'custom' | 'external'
export type ToolType = 'function' | 'provider'

export interface AgentToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string
  name: string
  description: string
  category: ToolCategory
  type: ToolType
  parametersSchema: z.ZodType<TInput>
  execute?: (input: TInput) => Promise<TOutput>
}
