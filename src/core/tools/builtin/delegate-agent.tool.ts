import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import type { RunAgentInput } from '@/core/ports/in/agent.port'
import { computeCost } from '@/core/domain/entities/audit-event'
import type { AuditStorePort } from '@/core/ports/out/audit-store.port'

const genericInputSchema = z.object({
  agentId: z.string().describe('The ID of the agent to delegate to'),
  input: z.string().describe('The input message to send to the delegated agent'),
})

const bakedInputSchema = z.object({
  input: z.string().describe('The input message to send to the delegated agent'),
})

export interface DelegateAgentContext {
  __delegationDepth: number
  __delegationChain: string[]
  __maxDelegationDepth: number
  __parentExecutionId?: string
  // T1.12: trace propagation — injected when a tracer is active
  __traceId?: string
  __parentSpanId?: string
  __workspaceId?: string
}

/** Callback that runs an agent to completion — same signature as AgentPort.runAgentToCompletion */
export type RunToCompletionFn = (input: RunAgentInput) => Promise<{
  text: string
  object?: unknown
  totalTokens: number
  inputTokens: number
  outputTokens: number
  costUsd: string
}>

export function createDelegateAgentTool(
  runToCompletion: RunToCompletionFn,
  auditStore: AuditStorePort,
  delegationContext?: Partial<DelegateAgentContext>,
  bakedAgentId?: string,
): AgentToolDefinition {
  const depth = delegationContext?.__delegationDepth ?? 0
  const chain = delegationContext?.__delegationChain ?? []
  const maxDepth = delegationContext?.__maxDelegationDepth ?? 3
  const parentExecutionId = delegationContext?.__parentExecutionId

  const traceId = delegationContext?.__traceId
  const parentSpanId = delegationContext?.__parentSpanId
  const workspaceId = delegationContext?.__workspaceId

  async function executeDelegation(agentId: string, inputText: string): Promise<string> {
    try {
      if (depth >= maxDepth) {
        return `Max delegation depth (${maxDepth}) exceeded`
      }

      if (chain.includes(agentId)) {
        const chainStr = [...chain, agentId].join(' → ')
        return `Circular delegation detected: ${chainStr}`
      }

      const result = await runToCompletion({
        agentId,
        messages: [{ id: randomUUID(), role: 'user', content: inputText, createdAt: new Date() }],
        parentExecutionId,
        delegationContext: {
          depth: depth + 1,
          chain: [...chain, agentId],
        },
        // T1.12: propagate trace context to child agent
        context: {
          ...(traceId ? { __traceId: traceId } : {}),
          ...(parentSpanId ? { __parentSpanId: parentSpanId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
        },
      })

      // The parent agentId is the last in the chain before agentId
      const parentAgentId = chain[chain.length - 1] ?? null
      void auditStore.record({
        userId: 'system',
        eventType: 'agent_delegation',
        metadata: { parentAgentId, childAgentId: agentId, depth: depth + 1 },
        tokenCount: result.totalTokens,
        costUsd: computeCost('unknown', result.totalTokens),
      }).catch((err: unknown) => console.error('audit failed', err))

      return result.text
    } catch (error) {
      return error instanceof Error ? error.message : 'Delegation failed with unknown error'
    }
  }

  if (bakedAgentId !== undefined) {
    return {
      id: `delegate-agent-${bakedAgentId}`,
      name: `delegate-agent-${bakedAgentId}`,
      description: `Delegate a task to the specialized agent. Use this when the task requires this agent's expertise.`,
      category: 'builtin',
      type: 'agent',
      parametersSchema: bakedInputSchema,
      execute: async (input: unknown) => {
        const parsed = bakedInputSchema.parse(input)
        return executeDelegation(bakedAgentId, parsed.input)
      },
    }
  }

  return {
    id: 'delegate-agent',
    name: 'delegate-agent',
    description: 'Delegate a task to another specialized agent. Use this when the task requires expertise from a specific agent.',
    category: 'builtin',
    type: 'agent',
    parametersSchema: genericInputSchema,
    execute: async (input: unknown) => {
      const parsed = genericInputSchema.parse(input)
      return executeDelegation(parsed.agentId, parsed.input)
    },
  }
}
