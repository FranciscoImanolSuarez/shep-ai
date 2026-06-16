import { eq, and, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { WorkflowStorePort } from '@/core/ports/out/workflow-store.port'
import type { Workflow } from '@/core/domain/entities/workflow'
import type { WorkflowRun, WorkflowRunStatus } from '@/core/domain/entities/workflow-run'
import type { WorkflowRunNode, WorkflowRunNodeStatus } from '@/core/domain/entities/workflow-run-node'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'
import type { WorkflowNodeType } from '@/core/domain/entities/workflow-node'
import { workflows, workflowRuns, workflowRunNodes } from './schema'
import type { Database } from './connection'

type WorkflowRow = typeof workflows.$inferSelect
type WorkflowRunRow = typeof workflowRuns.$inferSelect
type WorkflowRunNodeRow = typeof workflowRunNodes.$inferSelect

// --- Domain mappers ---

function toWorkflowDomain(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    definition: row.definition as WorkflowDefinition,
    version: row.version,
    enabled: row.enabled,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toWorkflowRunDomain(row: WorkflowRunRow): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflowId,
    workspaceId: row.workspaceId,
    triggeredBy: row.triggeredBy as 'manual' | 'api',
    triggeredByUserId: row.triggeredByUserId ?? undefined,
    status: row.status as WorkflowRunStatus,
    definitionSnapshot: row.definitionSnapshot as WorkflowDefinition,
    input: (row.input ?? {}) as Record<string, unknown>,
    output: row.output != null ? (row.output as Record<string, unknown>) : undefined,
    errorMessage: row.errorMessage ?? undefined,
    errorNodeId: row.errorNodeId ?? undefined,
    traceId: row.traceId ?? undefined,
    totalTokens: row.totalTokens,
    totalCostUsd: row.totalCostUsd as string,
    durationMs: row.durationMs ?? undefined,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
  }
}

function toWorkflowRunNodeDomain(row: WorkflowRunNodeRow): WorkflowRunNode {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    nodeId: row.nodeId,
    nodeType: row.nodeType as WorkflowNodeType,
    status: row.status as WorkflowRunNodeStatus,
    input: row.input ?? undefined,
    output: row.output ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    spanId: row.spanId ?? undefined,
    agentExecutionId: row.agentExecutionId ?? undefined,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  }
}

// --- Adapter ---

export class WorkflowStoreAdapter implements WorkflowStorePort {
  constructor(private readonly db: Database) {}

  // --- Workflow CRUD ---

  async saveWorkflow(w: Workflow): Promise<Workflow> {
    const [row] = await this.db
      .insert(workflows)
      .values({
        id: w.id,
        workspaceId: w.workspaceId,
        name: w.name,
        description: w.description,
        definition: w.definition as typeof workflows.$inferInsert['definition'],
        version: w.version,
        enabled: w.enabled,
        metadata: w.metadata,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })
      .returning()

    return toWorkflowDomain(row)
  }

  async updateWorkflow(
    workspaceId: string,
    id: string,
    patch: Partial<Omit<Workflow, 'id' | 'workspaceId' | 'createdAt'>>,
  ): Promise<Workflow> {
    const values: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    if (patch.name !== undefined) values.name = patch.name
    if (patch.description !== undefined) values.description = patch.description
    if (patch.definition !== undefined) values.definition = patch.definition
    if (patch.version !== undefined) values.version = patch.version
    if (patch.enabled !== undefined) values.enabled = patch.enabled
    if (patch.metadata !== undefined) values.metadata = patch.metadata

    const [row] = await this.db
      .update(workflows)
      .set(values)
      .where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
      .returning()

    if (!row) throw new Error(`Workflow not found: ${id}`)
    return toWorkflowDomain(row)
  }

  async deleteWorkflow(workspaceId: string, id: string): Promise<void> {
    await this.db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
  }

  async listWorkflows(workspaceId: string): Promise<Workflow[]> {
    const rows = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.workspaceId, workspaceId))
      .orderBy(desc(workflows.createdAt))
      .limit(200)

    return rows.map(toWorkflowDomain)
  }

  async getWorkflow(workspaceId: string, id: string): Promise<Workflow | null> {
    const [row] = await this.db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))

    return row ? toWorkflowDomain(row) : null
  }

  // --- Run CRUD ---

  async insertRun(run: WorkflowRun): Promise<WorkflowRun> {
    const [row] = await this.db
      .insert(workflowRuns)
      .values({
        id: run.id,
        workflowId: run.workflowId,
        workspaceId: run.workspaceId,
        triggeredBy: run.triggeredBy,
        triggeredByUserId: run.triggeredByUserId ?? null,
        status: run.status,
        definitionSnapshot: run.definitionSnapshot as typeof workflowRuns.$inferInsert['definitionSnapshot'],
        input: run.input,
        output: run.output ?? null,
        errorMessage: run.errorMessage ?? null,
        errorNodeId: run.errorNodeId ?? null,
        traceId: run.traceId ?? null,
        totalTokens: run.totalTokens,
        totalCostUsd: run.totalCostUsd,
        durationMs: run.durationMs ?? null,
        startedAt: run.startedAt,
        completedAt: run.completedAt ?? null,
      })
      .returning()

    return toWorkflowRunDomain(row)
  }

  async updateRun(id: string, patch: Partial<WorkflowRun>): Promise<WorkflowRun> {
    const values: Record<string, unknown> = {}
    if (patch.status !== undefined) values.status = patch.status
    if (patch.output !== undefined) values.output = patch.output
    if (patch.errorMessage !== undefined) values.errorMessage = patch.errorMessage
    if (patch.errorNodeId !== undefined) values.errorNodeId = patch.errorNodeId
    if (patch.traceId !== undefined) values.traceId = patch.traceId
    if (patch.totalTokens !== undefined) values.totalTokens = patch.totalTokens
    if (patch.totalCostUsd !== undefined) values.totalCostUsd = patch.totalCostUsd
    if (patch.durationMs !== undefined) values.durationMs = patch.durationMs
    if (patch.completedAt !== undefined) values.completedAt = patch.completedAt

    const [row] = await this.db
      .update(workflowRuns)
      .set(values)
      .where(eq(workflowRuns.id, id))
      .returning()

    if (!row) throw new Error(`WorkflowRun not found: ${id}`)
    return toWorkflowRunDomain(row)
  }

  async getRun(workspaceId: string, id: string): Promise<WorkflowRun | null> {
    const [row] = await this.db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.id, id), eq(workflowRuns.workspaceId, workspaceId)))

    return row ? toWorkflowRunDomain(row) : null
  }

  async listRuns(workspaceId: string, workflowId: string, limit = 20): Promise<WorkflowRun[]> {
    const rows = await this.db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.workflowId, workflowId), eq(workflowRuns.workspaceId, workspaceId)))
      .orderBy(desc(workflowRuns.startedAt))
      .limit(limit)

    return rows.map(toWorkflowRunDomain)
  }

  // --- RunNode CRUD ---

  async insertRunNode(node: WorkflowRunNode): Promise<void> {
    await this.db.insert(workflowRunNodes).values({
      id: node.id ?? randomUUID(),
      workflowRunId: node.workflowRunId,
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      status: node.status,
      input: node.input ?? null,
      output: node.output ?? null,
      errorMessage: node.errorMessage ?? null,
      spanId: node.spanId ?? null,
      agentExecutionId: node.agentExecutionId ?? null,
      startedAt: node.startedAt ?? null,
      completedAt: node.completedAt ?? null,
    })
  }

  async updateRunNode(id: string, patch: Partial<WorkflowRunNode>): Promise<void> {
    const values: Record<string, unknown> = {}
    if (patch.status !== undefined) values.status = patch.status
    if (patch.output !== undefined) values.output = patch.output
    if (patch.input !== undefined) values.input = patch.input
    if (patch.errorMessage !== undefined) values.errorMessage = patch.errorMessage
    if (patch.spanId !== undefined) values.spanId = patch.spanId
    if (patch.agentExecutionId !== undefined) values.agentExecutionId = patch.agentExecutionId
    if (patch.startedAt !== undefined) values.startedAt = patch.startedAt
    if (patch.completedAt !== undefined) values.completedAt = patch.completedAt

    await this.db
      .update(workflowRunNodes)
      .set(values)
      .where(eq(workflowRunNodes.id, id))
  }

  async getRunNodes(workflowRunId: string): Promise<WorkflowRunNode[]> {
    const rows = await this.db
      .select()
      .from(workflowRunNodes)
      .where(eq(workflowRunNodes.workflowRunId, workflowRunId))
      .orderBy(workflowRunNodes.startedAt)

    return rows.map(toWorkflowRunNodeDomain)
  }
}
