import { randomUUID } from 'crypto'
import type { Agent, AgentConfig, DEFAULT_AGENT_CONFIG } from '@/core/domain/entities/agent'
import type { AgentExecution } from '@/core/domain/entities/agent-execution'
import type { AgentPort, CreateAgentInput, UpdateAgentInput, RunAgentInput } from '@/core/ports/in/agent.port'
import type { AgentStorePort } from '@/core/ports/out/agent-store.port'
import type { AgentExecutionStorePort } from '@/core/ports/out/agent-execution-store.port'
import type { ToolRegistry } from '@/core/tools/tool-registry'
import type { AgentRunnerAdapter } from '@/adapters/ai/agent-runner.adapter'
import { DEFAULT_AGENT_CONFIG as defaultConfig } from '@/core/domain/entities/agent'

export class AgentUseCase implements AgentPort {
  constructor(
    private readonly agentStore: AgentStorePort,
    private readonly executionStore: AgentExecutionStorePort,
    private readonly toolRegistry: ToolRegistry,
    private readonly agentRunner: AgentRunnerAdapter,
  ) {}

  async createAgent(input: CreateAgentInput): Promise<Agent> {
    const now = new Date()
    const agent: Agent = {
      id: randomUUID(),
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

    return this.agentStore.update(id, data)
  }

  async deleteAgent(id: string): Promise<void> {
    return this.agentStore.delete(id)
  }

  async listAgents(): Promise<Agent[]> {
    return this.agentStore.findAll()
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agentStore.findById(id)
  }

  async runAgent(input: RunAgentInput): Promise<ReadableStream> {
    const agent = await this.agentStore.findById(input.agentId)
    if (!agent) throw new Error(`Agent not found: ${input.agentId}`)

    // Resolve tools from registry
    const tools = this.toolRegistry.getByIds(agent.toolIds)

    // Create execution record
    const executionId = randomUUID()
    const execution: AgentExecution = {
      id: executionId,
      agentId: agent.id,
      status: 'running',
      input: input.messages,
      steps: [],
      totalTokens: 0,
      createdAt: new Date(),
    }
    await this.executionStore.save(execution)

    // Run agent with tool loop
    const agentStream = this.agentRunner.run({
      agent,
      messages: input.messages,
      tools,
      context: input.context,
    })

    // Wrap stream to capture finish event and persist execution
    const executionStore = this.executionStore
    const reader = agentStream.getReader()

    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
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
          } catch {
            // Best-effort
          }
        }

        controller.enqueue(value)
      },
      cancel() {
        reader.cancel()
      },
    })
  }

  async getExecution(id: string): Promise<AgentExecution | null> {
    return this.executionStore.findById(id)
  }

  async getExecutions(agentId: string, limit?: number): Promise<AgentExecution[]> {
    return this.executionStore.findByAgentId(agentId, limit)
  }
}
