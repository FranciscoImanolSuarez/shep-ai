import type { z } from 'zod'
import type { Agent } from '@/core/domain/entities/agent'
import type { Message } from '@/core/domain/entities/message'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import type { AgentToolCall } from '@/core/domain/entities/agent-execution'

/**
 * Input for a fully-resolved agent turn. The use-case layer has already
 * selected the model, assembled the messages and resolved the tools before
 * handing off to the runner.
 */
export interface AgentRunnerInput {
  agent: Agent
  messages: Message[]
  tools: AgentToolDefinition[]
  context?: Record<string, unknown>
  /**
   * P0.2 — Optional Zod schema. When set, the model is forced to produce a JSON
   * object matching the schema and `AgentRunResult.object` is populated.
   * Honored by `runToCompletion` only; ignored by `run` (streaming).
   */
  outputSchema?: z.ZodType<unknown>
}

export interface AgentRunResult {
  text: string
  /** P0.2 — populated when `AgentRunnerInput.outputSchema` was provided. */
  object?: unknown
  steps: Array<{
    stepNumber: number
    text: string
    toolCalls: AgentToolCall[]
    tokensUsed: number
    finishReason: string
  }>
  totalTokens: number
  inputTokens: number
  outputTokens: number
}

/** Optional runtime tracing context passed alongside an AgentRunnerInput. */
export interface AgentRuntimeContext {
  traceId: string
  parentSpanId: string
  workspaceId: string
}

/**
 * Port for the agent runner — runs a fully-resolved agent turn, streaming or
 * blocking. `AgentRunnerAdapter` (infra) implements this interface; the core
 * depends only on this port.
 */
export interface AgentRunnerPort {
  runToCompletion(
    input: AgentRunnerInput,
    runtimeContext?: AgentRuntimeContext,
  ): Promise<AgentRunResult>

  run(
    input: AgentRunnerInput,
    runtimeContext?: AgentRuntimeContext,
  ): ReadableStream<string>
}
