import type { z } from 'zod'

export type ToolCategory = 'builtin' | 'custom' | 'external'
export type ToolType = 'function' | 'provider' | 'agent' | 'mcp'

export interface AgentToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string
  name: string
  description: string
  category: ToolCategory
  type: ToolType
  parametersSchema: z.ZodType<TInput>
  /**
   * Tool body. May be:
   *  - `Promise<TOutput>` — single result returned at the end (the common case).
   *  - `AsyncIterable<TOutput>` — P2.3: a generator that yields preliminary
   *    results (e.g. `{ status: 'loading', message: '...' }`) before the final
   *    one. The SDK streams each yielded value as a tool-result delta so the
   *    chat UI can show progress during long tool calls.
   */
  execute?: (input: TInput) => Promise<TOutput> | AsyncIterable<TOutput>
  /**
   * P0.3 — Pre-built AI SDK tool entry (typed as unknown here to avoid leaking
   * SDK types into the domain). When set, the runner uses it directly instead
   * of wrapping `execute` through `tool({...})`. Used for MCP-provided tools
   * whose execute signature carries extra options the SDK passes through.
   */
  sdkTool?: unknown
  /**
   * P1.1 — Human-in-the-loop gate. When set, the SDK pauses BEFORE invoking
   * `execute` and emits an `approval-requested` part on the stream. Resume by
   * sending an approval response back. Use `true` to always require approval,
   * or a predicate over the input for dynamic approval (e.g. `amount > 1000`).
   */
  needsApproval?: boolean | ((input: TInput) => boolean | Promise<boolean>)
}
