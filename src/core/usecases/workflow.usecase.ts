import { randomUUID } from 'crypto'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsonLogic = require('json-logic-js') as { apply: (rule: unknown, data: unknown) => unknown }
import type { WorkflowPort, CreateWorkflowInput, UpdateWorkflowInput, RunWorkflowInput } from '@/core/ports/in/workflow.port'
import type { WorkflowStorePort } from '@/core/ports/out/workflow-store.port'
import type { AgentStorePort } from '@/core/ports/out/agent-store.port'
import type { AuditStorePort } from '@/core/ports/out/audit-store.port'
import type { Workflow } from '@/core/domain/entities/workflow'
import type { WorkflowRun } from '@/core/domain/entities/workflow-run'
import type { WorkflowRunNode } from '@/core/domain/entities/workflow-run-node'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'
import type { WorkflowNode } from '@/core/domain/entities/workflow-node'
import { detectCycle } from './workflow-dag'

// Forward-declare the runtime type to avoid circular imports.
// WorkflowRuntimeUseCase is imported at runtime (not at module load) for type checks.
interface WorkflowRuntime {
  execute(
    workspaceId: string,
    userId: string | undefined,
    workflowId: string,
    snapshot: WorkflowDefinition,
    input: Record<string, unknown>,
    runId: string,
  ): Promise<{
    status: 'completed' | 'failed'
    output?: Record<string, unknown>
    errorNodeId?: string
    errorMessage?: string
    totalTokens: number
    totalCostUsd: string
    traceId?: string
    durationMs: number
  }>
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class WorkflowUseCase implements WorkflowPort {
  constructor(
    private readonly workflowStore: WorkflowStorePort,
    private readonly agentStore: AgentStorePort,
    private readonly runtime: WorkflowRuntime,
    private readonly auditStore?: AuditStorePort,
  ) {}

  // --- Validation helpers ---

  private validateDefinition(definition: WorkflowDefinition): void {
    // Must have at least one input and one output node
    const hasInput = definition.nodes.some((n) => n.type === 'input')
    const hasOutput = definition.nodes.some((n) => n.type === 'output')
    if (!hasInput || !hasOutput) {
      throw new ValidationError('Workflow must have at least one input and one output node')
    }

    // Must not have cycles
    if (detectCycle(definition.nodes, definition.edges)) {
      throw new ValidationError('Workflow definition contains a cycle — only DAGs are allowed')
    }

    // T2.9: validate JSONLogic expressions in condition nodes
    for (const node of definition.nodes) {
      if (node.type === 'condition') {
        this.validateJsonLogicExpression(node)
      }
    }
  }

  private validateJsonLogicExpression(node: WorkflowNode & { type: 'condition' }): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(node.config.expression)
    } catch {
      throw new ValidationError(
        `Invalid JSONLogic expression in condition node ${node.id}: expression is not valid JSON`,
      )
    }
    try {
      // json-logic-js doesn't expose a validate() — use apply() with empty data as a smoke test.
      // If the expression is structurally invalid, apply() will throw or return unexpected types.
      jsonLogic.apply(parsed, {})
    } catch {
      throw new ValidationError(
        `Invalid JSONLogic expression in condition node ${node.id}: expression failed validation`,
      )
    }
  }

  private async validateAgentNodes(definition: WorkflowDefinition, workspaceId: string): Promise<void> {
    // T3.3: Use findByIdAndWorkspace to enforce workspace isolation during validation.
    // If an agent exists in a different workspace, it is treated as not found (security: don't
    // reveal cross-workspace existence). The method returns null for both missing AND
    // cross-workspace agents, which correctly results in a ValidationError either way.
    const agentNodes = definition.nodes.filter((n) => n.type === 'agent')
    for (const node of agentNodes) {
      if (node.type !== 'agent') continue
      const agent = await this.agentStore.findByIdAndWorkspace(node.config.agentId, workspaceId)
      if (!agent) {
        throw new ValidationError(
          `Agent not found: ${node.config.agentId} (referenced by node ${node.id})`,
        )
      }
    }
  }

  // --- WorkflowPort methods ---

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    this.validateDefinition(input.definition)
    await this.validateAgentNodes(input.definition, input.workspaceId)

    const now = new Date()
    const workflow: Workflow = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? '',
      definition: input.definition,
      version: 1,
      enabled: true,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.workflowStore.saveWorkflow(workflow)

    // T2.30: audit event — workflow.created
    this.auditStore?.record({
      userId: input.workspaceId, // userId is workspaceId in this context (no per-user tracking at usecase level)
      eventType: 'workflow.created',
      metadata: { workflowId: saved.id, workspaceId: input.workspaceId, name: saved.name },
      tokenCount: 0,
    }).catch((err) => console.error('[WorkflowUseCase] Failed to record workflow.created audit event:', err))

    return saved
  }

  async updateWorkflow(workspaceId: string, id: string, input: UpdateWorkflowInput): Promise<Workflow> {
    const existing = await this.workflowStore.getWorkflow(workspaceId, id)
    if (!existing) {
      throw new NotFoundError(`Workflow not found: ${id}`)
    }

    // If definition is changing, re-validate
    if (input.definition) {
      this.validateDefinition(input.definition)
      await this.validateAgentNodes(input.definition, workspaceId)
    }

    const patch: Partial<Omit<Workflow, 'id' | 'workspaceId' | 'createdAt'>> = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.description !== undefined) patch.description = input.description
    if (input.definition !== undefined) {
      patch.definition = input.definition
      patch.version = existing.version + 1
    }
    if (input.enabled !== undefined) patch.enabled = input.enabled

    const updated = await this.workflowStore.updateWorkflow(workspaceId, id, patch)

    // T2.30: audit event — workflow.updated
    const changedFields = Object.keys(patch) as string[]
    this.auditStore?.record({
      userId: workspaceId,
      eventType: 'workflow.updated',
      metadata: { workflowId: id, workspaceId, changedFields },
      tokenCount: 0,
    }).catch((err) => console.error('[WorkflowUseCase] Failed to record workflow.updated audit event:', err))

    return updated
  }

  async deleteWorkflow(workspaceId: string, id: string): Promise<void> {
    const existing = await this.workflowStore.getWorkflow(workspaceId, id)
    if (!existing) {
      throw new NotFoundError(`Workflow not found: ${id}`)
    }
    await this.workflowStore.deleteWorkflow(workspaceId, id)

    // T2.30: audit event — workflow.deleted
    this.auditStore?.record({
      userId: workspaceId,
      eventType: 'workflow.deleted',
      metadata: { workflowId: id, workspaceId },
      tokenCount: 0,
    }).catch((err) => console.error('[WorkflowUseCase] Failed to record workflow.deleted audit event:', err))
  }

  async listWorkflows(workspaceId: string): Promise<Workflow[]> {
    return this.workflowStore.listWorkflows(workspaceId)
  }

  async getWorkflow(workspaceId: string, id: string): Promise<Workflow | null> {
    return this.workflowStore.getWorkflow(workspaceId, id)
  }

  async runWorkflow(input: RunWorkflowInput): Promise<WorkflowRun> {
    const workflow = await this.workflowStore.getWorkflow(input.workspaceId, input.workflowId)
    if (!workflow) {
      throw new NotFoundError(`Workflow not found: ${input.workflowId}`)
    }

    const runId = randomUUID()
    const now = new Date()

    // Snapshot the definition at run start (ADR-4)
    const definitionSnapshot = workflow.definition

    // Insert initial run row with status=running
    const run: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      workspaceId: input.workspaceId,
      triggeredBy: 'manual',
      triggeredByUserId: input.userId,
      status: 'running',
      definitionSnapshot,
      input: input.input,
      output: undefined,
      totalTokens: 0,
      totalCostUsd: '0',
      startedAt: now,
    }

    await this.workflowStore.insertRun(run)

    // P2.2: durable executor via Inngest. When `WORKFLOW_EXECUTOR=inngest` is
    // set, dispatch the run to Inngest and return immediately with status=running.
    // The workflow runner function persists each completed node so a server
    // restart resumes from the last checkpoint. Callers poll `getRun` for state.
    if (process.env.WORKFLOW_EXECUTOR === 'inngest') {
      const { inngest, WORKFLOW_EXECUTE_REQUESTED } = await import('@/lib/inngest/client')
      await inngest.send({
        name: WORKFLOW_EXECUTE_REQUESTED,
        data: {
          runId,
          workspaceId: input.workspaceId,
          userId: input.userId,
          workflowId: workflow.id,
          snapshot: definitionSnapshot,
          input: input.input,
        },
      })
      // Return the running row — the caller (UI) polls until completedAt is set.
      return run
    }

    // Delegate execution to runtime — this runs the actual graph
    const result = await this.runtime.execute(
      input.workspaceId,
      input.userId,
      workflow.id,
      definitionSnapshot,
      input.input,
      runId,
    )

    // Update the run with the result
    const updatedRun = await this.workflowStore.updateRun(runId, {
      status: result.status,
      output: result.output,
      errorNodeId: result.errorNodeId,
      errorMessage: result.errorMessage,
      totalTokens: result.totalTokens,
      totalCostUsd: result.totalCostUsd,
      traceId: result.traceId,
      durationMs: result.durationMs,
      completedAt: new Date(),
    })

    return updatedRun
  }

  async getRun(workspaceId: string, runId: string): Promise<{ run: WorkflowRun; nodes: WorkflowRunNode[] } | null> {
    const run = await this.workflowStore.getRun(workspaceId, runId)
    if (!run) return null

    const nodes = await this.workflowStore.getRunNodes(runId)
    return { run, nodes }
  }

  async listRuns(workspaceId: string, workflowId: string, limit?: number): Promise<WorkflowRun[]> {
    return this.workflowStore.listRuns(workspaceId, workflowId, limit)
  }
}
