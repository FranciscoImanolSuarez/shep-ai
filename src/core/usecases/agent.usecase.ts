import { randomUUID } from 'crypto'
import type { Agent } from '@/core/domain/entities/agent'
import type { AgentExecution } from '@/core/domain/entities/agent-execution'
import type { AgentPort, CreateAgentInput, UpdateAgentInput, RunAgentInput } from '@/core/ports/in/agent.port'
import type { AgentStorePort } from '@/core/ports/out/agent-store.port'
import type { AgentExecutionStorePort } from '@/core/ports/out/agent-execution-store.port'
import type { TracerPort } from '@/core/ports/out/tracer.port'
import type { ToolRegistry } from '@/core/tools/tool-registry'
import type { AgentRunnerPort } from '@/core/ports/out/agent-runner.port'
import type { RagPort } from '@/core/ports/in/rag.port'
import type { McpServerStorePort } from '@/core/ports/out/mcp-server-store.port'
import type { McpBundleLoaderPort } from '@/core/ports/out/mcp-bundle-loader.port'
import type { AuditStorePort } from '@/core/ports/out/audit-store.port'
import { DEFAULT_AGENT_CONFIG as defaultConfig } from '@/core/domain/entities/agent'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import { createDelegateAgentTool, createRagSearchTool } from '@/core/tools/builtin'
import { computeCost } from '@/core/domain/entities/audit-event'

// ---------------------------------------------------------------------------
// Typed context bag — replaces Record<string, unknown> with `as string` casts
// ---------------------------------------------------------------------------

export interface AgentRunContext {
  /** Existing trace id — if set, this run attaches to the trace as a child span */
  __traceId?: string
  /** Parent span to attach the agent span under */
  __parentSpanId?: string
  /** Workspace that owns this run — required for tracing and MCP lookup */
  workspaceId?: string
  /** User triggering the run — used for audit recording */
  userId?: string
  /** Current delegation depth (set by delegate-agent tool) */
  __delegationDepth?: number
  /** Delegation chain accumulated so far */
  __delegationChain?: string[]
}

// ---------------------------------------------------------------------------
// Exported pure helpers — extracted for testability (no behaviour change)
// ---------------------------------------------------------------------------

export interface ClassifiedToolIds {
  regularIds: string[]
  /** Full ids including the 'agent:' prefix — stripped downstream via .slice('agent:'.length) */
  agentIds: string[]
  /** Stripped ids — the 'mcp:' prefix is already removed */
  mcpServerIds: string[]
}

/**
 * Splits a flat tool-id array into three buckets based on prefix convention:
 *  - `agent:` prefix → agentIds (prefix KEPT; stripped by the delegation factory)
 *  - `mcp:` prefix  → mcpServerIds (prefix STRIPPED here)
 *  - bare id         → regularIds
 */
export function classifyToolIds(ids: string[]): ClassifiedToolIds {
  const regularIds = ids.filter((id) => !id.startsWith('agent:') && !id.startsWith('mcp:'))
  const agentIds = ids.filter((id) => id.startsWith('agent:'))
  const mcpServerIds = ids
    .filter((id) => id.startsWith('mcp:'))
    .map((id) => id.slice('mcp:'.length))
  return { regularIds, agentIds, mcpServerIds }
}

/**
 * Builds a compact memory snippet from completed executions.
 * Returns '' when there are no completed runs with a result.
 * Shows at most 5 runs; truncates long strings with '…'.
 */
export function buildMemorySnippet(executions: AgentExecution[]): string {
  const completed = executions.filter((e) => e.status === 'completed' && e.result)
  if (completed.length === 0) return ''

  const formatTime = (d: Date): string => d.toISOString().slice(0, 10)
  const truncate = (s: string, max: number): string =>
    s.length <= max ? s : s.slice(0, max) + '…'

  const entries = completed.slice(0, 5).map((exec, i) => {
    const rawContent = exec.input.find((m) => m.role === 'user')?.content ?? ''
    const textContent =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? (rawContent as Array<{ type?: string; text?: string }>)
              .filter((p) => p.type === 'text' && typeof p.text === 'string')
              .map((p) => p.text)
              .join('')
          : ''
    const userSnippet = truncate(textContent, 160)
    const resultSnippet = truncate(exec.result ?? '', 240)
    return `#${i + 1} (${formatTime(exec.createdAt)})\n  user: ${userSnippet}\n  you: ${resultSnippet}`
  })

  return [
    '\n\n<recent-sessions>',
    'For context, here are your last completed conversations with this user.',
    'These are PRIOR sessions for memory only — do NOT re-execute tool calls from them.',
    ...entries,
    '</recent-sessions>',
  ].join('\n')
}

// ---------------------------------------------------------------------------

export class AgentUseCase implements AgentPort {
  constructor(
    private readonly agentStore: AgentStorePort,
    private readonly executionStore: AgentExecutionStorePort,
    private readonly toolRegistry: ToolRegistry,
    private readonly agentRunner: AgentRunnerPort,
    private readonly ragPort: RagPort,
    private readonly mcpServerStore: McpServerStorePort,
    private readonly mcpBundleLoader: McpBundleLoaderPort,
    private readonly auditStore: AuditStorePort,
    // T1.10: optional tracer — if absent, no spans are emitted
    private readonly tracer?: TracerPort,
  ) {}

  // ---------------------------------------------------------------------------
  // D4: extracted trace-setup — shared by runAgent and runAgentToCompletion
  // ---------------------------------------------------------------------------

  private async resolveTraceSetup(
    agent: Agent,
    ctx: AgentRunContext,
  ): Promise<{ traceCtx: Awaited<ReturnType<TracerPort['startTrace']>> | undefined; agentSpanId: string | undefined; isTraceOwner: boolean }> {
    const { workspaceId, __traceId: incomingTraceId, __parentSpanId: incomingParentSpanId } = ctx

    if (!this.tracer || !workspaceId) {
      return { traceCtx: undefined, agentSpanId: undefined, isTraceOwner: false }
    }

    let traceCtx: Awaited<ReturnType<TracerPort['startTrace']>>
    let isTraceOwner = false

    if (!incomingTraceId) {
      // This call owns the trace — start a new one
      traceCtx = await this.tracer.startTrace({
        workspaceId,
        rootKind: 'agent',
        attributes: { 'agent.id': agent.id, 'agent.name': agent.name },
      })
      isTraceOwner = true
    } else {
      // Attach to an existing trace as a child span
      traceCtx = { traceId: incomingTraceId, workspaceId }
      isTraceOwner = false
    }

    const { spanId: agentSpanId } = this.tracer.startSpan(traceCtx, {
      name: `agent.${agent.name}`,
      kind: 'agent',
      parentSpanId: incomingParentSpanId,
      attributes: { 'agent.id': agent.id },
    })

    return { traceCtx, agentSpanId, isTraceOwner }
  }

  /**
   * P0.3 — Now async. MCP tools live behind a network call and require lifecycle
   * cleanup. Returns the assembled tool list AND a `cleanup` that closes any
   * MCP clients opened during resolution. Callers must await `cleanup` in a
   * finally block after the agent run completes.
   */
  private async resolveTools(
    agent: Agent,
    delegationContext?: RunAgentInput['delegationContext'],
    parentExecutionId?: string,
    traceContext?: { traceId?: string; parentSpanId?: string; workspaceId?: string },
  ): Promise<{ tools: AgentToolDefinition[]; cleanup: () => Promise<void> }> {
    const { regularIds, agentIds, mcpServerIds } = classifyToolIds(agent.toolIds)

    // When the agent has a knowledgeBaseId, override the rag-search tool with a KB-scoped version
    let regularTools = this.toolRegistry.getByIds(regularIds)
    if (agent.knowledgeBaseId && regularIds.includes('rag-search')) {
      const scopedRagTool = createRagSearchTool(this.ragPort, agent.knowledgeBaseId) as AgentToolDefinition
      regularTools = regularTools.map((t) => t.id === 'rag-search' ? scopedRagTool : t)
    }

    // P0.3: MCP tools — fetch enabled servers in this workspace, open clients,
    // collect tools + close handlers. Failures on individual servers are logged
    // and skipped so one broken server does not break the whole agent run.
    const mcpTools: AgentToolDefinition[] = []
    const mcpCleanups: Array<() => Promise<void>> = []
    if (mcpServerIds.length > 0 && traceContext?.workspaceId) {
      const servers = await this.mcpServerStore.findEnabledByIds(mcpServerIds, traceContext.workspaceId)
      const bundles = await Promise.allSettled(servers.map((s) => this.mcpBundleLoader.loadBundle(s)))
      for (const bundle of bundles) {
        if (bundle.status === 'fulfilled') {
          mcpTools.push(...bundle.value.tools)
          mcpCleanups.push(bundle.value.close)
        } else {
          console.error('mcp server load failed', bundle.reason)
        }
      }
    }

    const agentTools: AgentToolDefinition[] = []
    if (agentIds.length > 0) {
      const depth = delegationContext?.depth ?? 0
      const chain = delegationContext?.chain ?? []
      const maxDepth = agent.config.maxDelegationDepth
      // Include current agent in chain so children can detect circular delegation back to this agent
      const chainWithCurrent = [...chain, agent.id]

      for (const toolId of agentIds) {
        const delegatedAgentId = toolId.slice('agent:'.length)
        agentTools.push(createDelegateAgentTool(
          (input) => this.runAgentToCompletion(input),
          this.auditStore,
          {
            __delegationDepth: depth,
            __delegationChain: chainWithCurrent,
            __maxDelegationDepth: maxDepth,
            __parentExecutionId: parentExecutionId,
            // T1.12: propagate trace context to child agent via delegation tool
            __traceId: traceContext?.traceId,
            __parentSpanId: traceContext?.parentSpanId,
            __workspaceId: traceContext?.workspaceId,
          },
          delegatedAgentId,
        ))
      }
    }

    const cleanup = async (): Promise<void> => {
      await Promise.allSettled(mcpCleanups.map((fn) => fn()))
    }

    return { tools: [...regularTools, ...mcpTools, ...agentTools], cleanup }
  }

  async createAgent(input: CreateAgentInput): Promise<Agent> {
    const now = new Date()
    const agent: Agent = {
      id: randomUUID(),
      knowledgeBaseId: input.knowledgeBaseId ?? null,
      workspaceId: input.workspaceId ?? null,
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      model: input.model,
      provider: input.provider,
      toolIds: input.toolIds ?? [],
      config: { ...defaultConfig, ...input.config },
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }
    return this.agentStore.save(agent)
  }

  async updateAgent(id: string, input: UpdateAgentInput): Promise<Agent> {
    const existing = await this.agentStore.findById(id)
    if (!existing) throw new Error(`Agent not found: ${id}`)

    const data: Partial<Omit<Agent, 'id' | 'createdAt'>> = {}
    if (input.name !== undefined) data.name = input.name
    if (input.description !== undefined) data.description = input.description
    if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt
    if (input.model !== undefined) data.model = input.model
    if (input.provider !== undefined) data.provider = input.provider
    if (input.toolIds !== undefined) data.toolIds = input.toolIds
    if (input.config !== undefined) data.config = { ...existing.config, ...input.config }
    if (input.metadata !== undefined) data.metadata = input.metadata
    if ('knowledgeBaseId' in input) data.knowledgeBaseId = input.knowledgeBaseId ?? null

    return this.agentStore.update(id, data)
  }

  async deleteAgent(id: string): Promise<void> {
    return this.agentStore.delete(id)
  }

  async listAgents(workspaceId?: string): Promise<Agent[]> {
    if (workspaceId) return this.agentStore.findByWorkspace(workspaceId)
    return this.agentStore.findAll()
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agentStore.findById(id)
  }

  /**
   * P1.2 — Build a compact memory snippet from the agent's recent completed
   * executions. Delegates to the exported pure helper `buildMemorySnippet`.
   */
  private buildMemorySnippet(executions: AgentExecution[]): string {
    return buildMemorySnippet(executions)
  }

  /**
   * P1.2 — When the agent has memoryEnabled, fetch its recent completed runs
   * and return a copy of the agent with memory appended to the system prompt.
   * Returns the original agent unchanged otherwise.
   */
  private async withMemory(agent: Agent): Promise<Agent> {
    if (!agent.config.memoryEnabled) return agent
    const recent = await this.executionStore.findByAgentId(agent.id, 5)
    const snippet = this.buildMemorySnippet(recent)
    if (!snippet) return agent
    return { ...agent, systemPrompt: agent.systemPrompt + snippet }
  }

  /**
   * Per-call config overrides (workflow nodes, scheduled runs) merged over the
   * stored config. Non-destructive — the persisted agent is never mutated.
   */
  private applyOverrides(agent: Agent, overrides?: RunAgentInput['configOverrides']): Agent {
    if (!overrides) return agent
    return { ...agent, config: { ...agent.config, ...overrides } }
  }

  async runAgent(input: RunAgentInput): Promise<ReadableStream> {
    const baseAgent = await this.agentStore.findById(input.agentId)
    if (!baseAgent) throw new Error(`Agent not found: ${input.agentId}`)
    // P1.2: optionally inject recent execution history into the system prompt
    const agent = await this.withMemory(this.applyOverrides(baseAgent, input.configOverrides))

    // Build delegation context fields for the runner context
    const delegationFields: Record<string, unknown> = {}
    if (input.delegationContext) {
      delegationFields.__delegationDepth = input.delegationContext.depth
      delegationFields.__delegationChain = input.delegationContext.chain
      delegationFields.__maxDelegationDepth = agent.config.maxDelegationDepth
    }
    if (input.parentExecutionId) {
      delegationFields.__parentExecutionId = input.parentExecutionId
    }

    // D5: typed context access
    const ctx: AgentRunContext = (input.context ?? {}) as AgentRunContext
    const workspaceId = ctx.workspaceId

    // D4: extracted trace setup
    const { traceCtx, agentSpanId, isTraceOwner } = await this.resolveTraceSetup(agent, ctx)

    // T1.12 + P0.3: Resolve tools AFTER trace context so delegation tools get
    // trace info. Now async because MCP tools require opening clients.
    const { tools, cleanup } = await this.resolveTools(
      agent,
      input.delegationContext,
      input.parentExecutionId,
      {
        traceId: traceCtx?.traceId,
        parentSpanId: agentSpanId, // child agent's root span parent = this agent's span
        workspaceId,
      },
    )

    // Create execution record
    const executionId = randomUUID()
    const execution: AgentExecution = {
      id: executionId,
      agentId: agent.id,
      status: 'running',
      input: input.messages,
      steps: [],
      totalTokens: 0,
      parentExecutionId: input.parentExecutionId,
      traceId: traceCtx?.traceId,
      createdAt: new Date(),
    }
    await this.executionStore.save(execution)

    // Build runtimeContext for the runner (only if we have tracer + traceCtx + agentSpanId)
    const runtimeContext =
      traceCtx && agentSpanId
        ? { traceId: traceCtx.traceId, parentSpanId: agentSpanId, workspaceId: traceCtx.workspaceId }
        : undefined

    // Run agent with tool loop
    const agentStream = this.agentRunner.run(
      {
        agent,
        messages: input.messages,
        tools,
        context: { ...input.context, ...delegationFields },
      },
      runtimeContext,
    )

    // Wrap stream to capture finish event and persist execution
    const executionStore = this.executionStore
    const tracer = this.tracer
    const reader = agentStream.getReader()

    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
          // P0.3: close MCP clients once the stream ends naturally
          await cleanup()
          controller.close()
          return
        }

        // Parse SSE to detect finish event and persist
        if (value.startsWith('event:finish\n')) {
          try {
            const dataLine = value.split('\n')[1]
            const data = JSON.parse(dataLine.replace('data:', ''))
            await executionStore.update(executionId, {
              status: 'completed',
              steps: data.steps,
              result: data.text,
              totalTokens: data.totalTokens,
              completedAt: new Date(),
            })

            // T1.10: close agent span and flush trace if owner
            if (tracer && traceCtx && agentSpanId) {
              tracer.endSpan(traceCtx, { spanId: agentSpanId, status: 'ok' })
              if (isTraceOwner) {
                await tracer.finishTrace(traceCtx, { status: 'ok' })
              }
            }
          } catch {
            // Best-effort persistence — don't break the stream
          }
        }

        if (value.startsWith('event:error\n')) {
          try {
            await executionStore.update(executionId, {
              status: 'failed',
              completedAt: new Date(),
            })

            // T1.10: close agent span with error and flush trace if owner
            if (tracer && traceCtx && agentSpanId) {
              tracer.endSpan(traceCtx, { spanId: agentSpanId, status: 'error' })
              if (isTraceOwner) {
                await tracer.finishTrace(traceCtx, { status: 'error' })
              }
            }
          } catch {
            // Best-effort
          }
        }

        controller.enqueue(value)
      },
      async cancel() {
        // P0.3: close MCP clients on consumer cancellation
        await cleanup()
        reader.cancel()
      },
    })
  }

  async runAgentToCompletion(input: RunAgentInput): Promise<{
    text: string
    object?: unknown
    totalTokens: number
    inputTokens: number
    outputTokens: number
    costUsd: string
  }> {
    const baseAgent = await this.agentStore.findById(input.agentId)
    if (!baseAgent) throw new Error(`Agent not found: ${input.agentId}`)
    // P1.2: optionally inject recent execution history into the system prompt
    const agent = await this.withMemory(this.applyOverrides(baseAgent, input.configOverrides))

    // D5: typed context access
    const ctx: AgentRunContext = (input.context ?? {}) as AgentRunContext
    const workspaceId = ctx.workspaceId
    const userId = ctx.userId

    // D4: extracted trace setup
    const { traceCtx, agentSpanId, isTraceOwner } = await this.resolveTraceSetup(agent, ctx)

    // T1.12 + P0.3: Resolve tools AFTER trace context so delegation tools get
    // trace info. Async because MCP tools open clients we must close after run.
    const { tools, cleanup } = await this.resolveTools(
      agent,
      input.delegationContext,
      input.parentExecutionId,
      {
        traceId: traceCtx?.traceId,
        parentSpanId: agentSpanId,
        workspaceId,
      },
    )

    // Create execution record
    const executionId = randomUUID()
    const execution: AgentExecution = {
      id: executionId,
      agentId: agent.id,
      status: 'running',
      input: input.messages,
      steps: [],
      totalTokens: 0,
      parentExecutionId: input.parentExecutionId,
      traceId: traceCtx?.traceId,
      createdAt: new Date(),
    }
    await this.executionStore.save(execution)

    // Build runtimeContext for the runner
    const runtimeContext =
      traceCtx && agentSpanId
        ? { traceId: traceCtx.traceId, parentSpanId: agentSpanId, workspaceId: traceCtx.workspaceId }
        : undefined

    try {
      const result = await this.agentRunner.runToCompletion(
        {
          agent,
          messages: input.messages,
          tools,
          context: input.context,
          // P0.2: per-call structured output
          outputSchema: input.outputSchema,
        },
        runtimeContext,
      )

      await this.executionStore.update(executionId, {
        status: 'completed',
        steps: result.steps,
        result: result.text,
        totalTokens: result.totalTokens,
        completedAt: new Date(),
      })

      // D6: compute cost once, reuse for audit and return value
      const rawCost = computeCost(agent.model, result.totalTokens)
      const costUsd = rawCost !== undefined ? rawCost.toFixed(6) : '0'

      if (userId) {
        void this.auditStore.record({
          userId,
          eventType: 'agent_run',
          metadata: { agentId: agent.id, executionId, steps: result.steps.length },
          tokenCount: result.totalTokens,
          costUsd: rawCost,
        }).catch((err: unknown) => console.error('audit failed', err))
      }

      // T1.10: close agent span + flush trace (if owner)
      if (this.tracer && traceCtx && agentSpanId) {
        this.tracer.endSpan(traceCtx, {
          spanId: agentSpanId,
          status: 'ok',
          attributes: { 'agent.execution.id': executionId },
        })
        if (isTraceOwner) {
          await this.tracer.finishTrace(traceCtx, { status: 'ok' })
        }
      }

      return {
        text: result.text,
        object: result.object,
        totalTokens: result.totalTokens,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd,
      }
    } catch (error) {
      await this.executionStore.update(executionId, {
        status: 'failed',
        completedAt: new Date(),
      })

      // T1.10: close agent span with error + flush trace (if owner)
      if (this.tracer && traceCtx && agentSpanId) {
        this.tracer.endSpan(traceCtx, {
          spanId: agentSpanId,
          status: 'error',
          statusMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        if (isTraceOwner) {
          await this.tracer.finishTrace(traceCtx, {
            status: 'error',
            statusMessage: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      throw error
    } finally {
      // P0.3: always close MCP clients, success or error
      await cleanup()
    }
  }

  async getExecution(id: string): Promise<AgentExecution | null> {
    return this.executionStore.findById(id)
  }

  async getExecutions(agentId: string, limit?: number): Promise<AgentExecution[]> {
    return this.executionStore.findByAgentId(agentId, limit)
  }
}
