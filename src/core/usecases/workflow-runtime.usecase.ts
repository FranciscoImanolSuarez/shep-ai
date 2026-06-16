import { randomUUID } from 'crypto'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsonLogic = require('json-logic-js') as { apply: (rule: unknown, data: unknown) => unknown }
import type { TracerPort, TraceContext } from '@/core/ports/out/tracer.port'
import type { WorkflowStorePort } from '@/core/ports/out/workflow-store.port'
import type { AgentPort, RunAgentInput } from '@/core/ports/in/agent.port'
import type { AuditStorePort } from '@/core/ports/out/audit-store.port'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'
import type { WorkflowNode } from '@/core/domain/entities/workflow-node'
import type { Message } from '@/core/domain/entities/message'
import { topologicalSort } from './workflow-dag'

// ---------------------------------------------------------------------------
// Exported pure helpers — extracted for testability (no behaviour change)
// ---------------------------------------------------------------------------

/**
 * Transitively marks a node and its downstream dependents as skipped.
 * Only marks nodes that have NO non-skipped incoming edges remaining.
 * (The "diamond rule": a node is only skipped if ALL its incoming edges come
 *  from already-skipped nodes.)
 */
export function markTransitiveSkips(
  startNodeId: string,
  edges: WorkflowDefinition['edges'],
  skippedNodes: Set<string>,
): void {
  const toVisit = [startNodeId]
  while (toVisit.length > 0) {
    const nodeId = toVisit.pop()!
    if (skippedNodes.has(nodeId)) continue
    skippedNodes.add(nodeId)
    for (const edge of edges) {
      if (edge.source !== nodeId) continue
      const target = edge.target
      if (skippedNodes.has(target)) continue
      const incomingToTarget = edges.filter((e) => e.target === target)
      const allIncomingSkipped = incomingToTarget.every((e) => skippedNodes.has(e.source))
      if (allIncomingSkipped) {
        toVisit.push(target)
      }
    }
  }
}

/**
 * Resolves the primary incoming value for a node from the nodeOutputs map.
 * Single edge → direct value. Multiple edges → keyed object.
 */
export function getIncomingValue(
  nodeId: string,
  edges: WorkflowDefinition['edges'],
  nodeOutputs: Record<string, unknown>,
): unknown {
  const incomingEdges = edges.filter((e) => e.target === nodeId)
  if (incomingEdges.length === 0) return undefined
  if (incomingEdges.length === 1) {
    return nodeOutputs[incomingEdges[0].source]
  }
  const result: Record<string, unknown> = {}
  for (const edge of incomingEdges) {
    result[edge.source] = nodeOutputs[edge.source]
  }
  return result
}

/**
 * Resolves the output-node template `"Hello {{nodeId}}"` against a nodeOutputs map.
 * Unknown references resolve to ''.
 */
export function resolveOutputTemplate(
  template: string,
  nodeOutputs: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match: string, nodeId: string) => {
    const val = nodeOutputs[nodeId]
    return val !== undefined ? String(val) : ''
  })
}

/**
 * Builds the prompt string for an agent node.
 * If the node has `inputTemplate`, renders it against nodeOutputs;
 * otherwise stringifies incomingValue (string → pass-through; object → JSON.stringify).
 */
export function buildAgentPrompt(
  inputTemplate: string | undefined,
  nodeOutputs: Record<string, unknown>,
  incomingValue: unknown,
): string {
  if (inputTemplate) {
    return inputTemplate.replace(/\{\{(\w+)\}\}/g, (_match: string, nid: string) => {
      const val = nodeOutputs[nid]
      return val !== undefined ? String(val) : ''
    })
  }
  if (incomingValue === undefined) return ''
  if (typeof incomingValue === 'string') return incomingValue
  return JSON.stringify(incomingValue)
}

// ---------------------------------------------------------------------------

interface ExecutionResult {
  status: 'completed' | 'failed'
  output?: Record<string, unknown>
  errorNodeId?: string
  errorMessage?: string
  totalTokens: number
  totalCostUsd: string
  traceId?: string
  durationMs: number
}

interface NodeContext {
  input: Record<string, unknown>
  nodeOutputs: Record<string, unknown>
}

/**
 * WorkflowRuntimeUseCase — sequential topological interpreter (ADR-8).
 * Runs a workflow definition snapshot, emitting OTel-compatible spans via TracerPort.
 * Does NOT create or update the WorkflowRun row itself — that is owned by WorkflowUseCase.
 * Only the per-node rows and run updates (traceId, status, output) happen here.
 */
export class WorkflowRuntimeUseCase {
  constructor(
    private readonly tracer: TracerPort,
    private readonly workflowStore: WorkflowStorePort,
    private readonly agentUseCase: AgentPort,
    private readonly auditStore?: AuditStorePort,
  ) {}

  async execute(
    workspaceId: string,
    userId: string | undefined,
    workflowId: string,
    snapshot: WorkflowDefinition,
    input: Record<string, unknown>,
    runId: string,
  ): Promise<ExecutionResult> {
    const startedAt = Date.now()
    let traceId: string | undefined
    let traceCtx: TraceContext | undefined
    let rootSpanId: string | undefined
    const totalTokens = 0
    const totalCostUsd = 0
    let lastFailedNodeId: string | undefined

    // T2.15: start trace for this workflow run
    try {
      traceCtx = await this.tracer.startTrace({
        workspaceId,
        rootKind: 'workflow',
        workflowRunId: runId,
        attributes: { 'workflow.id': workflowId, 'workflow.run.id': runId },
      })
      traceId = traceCtx.traceId

      // Root span for the entire workflow run
      const { spanId } = this.tracer.startSpan(traceCtx, {
        name: `workflow.${workflowId}`,
        kind: 'workflow',
        attributes: { 'workflow.id': workflowId, 'workflow.run.id': runId },
      })
      rootSpanId = spanId
    } catch (traceErr) {
      // Trace startup failure should not stop execution — log and continue without tracing
      console.error('[WorkflowRuntimeUseCase] Failed to start trace:', traceErr)
    }

    // Topological sort (cycle-free — validated at save time)
    const orderedNodes = topologicalSort(snapshot.nodes, snapshot.edges)

    const context: NodeContext = { input, nodeOutputs: {} }
    const skippedNodes = new Set<string>()

    // final output accumulates as output nodes complete
    let workflowOutput: Record<string, unknown> | undefined

    try {
      for (const node of orderedNodes) {
        // Respect condition branch skipping
        if (skippedNodes.has(node.id)) {
          // Insert a skipped run-node row
          await this.workflowStore.insertRunNode({
            id: randomUUID(),
            workflowRunId: runId,
            nodeId: node.id,
            nodeType: node.type,
            status: 'skipped',
          })
          continue
        }

        // T2.15: per-node span
        let nodeSpanId: string | undefined
        if (traceCtx && rootSpanId) {
          const { spanId } = this.tracer.startSpan(traceCtx, {
            name: `workflow_node.${node.type}:${node.id}`,
            kind: 'workflow_node',
            parentSpanId: rootSpanId,
            attributes: {
              'workflow.node.id': node.id,
              'workflow.node.type': node.type,
            },
          })
          nodeSpanId = spanId
        }

        // Insert running run-node row
        const runNodeId = randomUUID()
        await this.workflowStore.insertRunNode({
          id: runNodeId,
          workflowRunId: runId,
          nodeId: node.id,
          nodeType: node.type,
          status: 'running',
          spanId: nodeSpanId,
          startedAt: new Date(),
        })

        try {
          const output = await this.executeNode(
            node,
            context,
            snapshot,
            skippedNodes,
            workspaceId,
            userId,
            runId,
            traceCtx,
            nodeSpanId,
          )

          context.nodeOutputs[node.id] = output

          // If this is an output node, capture workflow-level output
          if (node.type === 'output') {
            workflowOutput = { ...workflowOutput, [node.id]: output }
          }

          // Update run-node as completed
          await this.workflowStore.updateRunNode(runNodeId, {
            status: 'completed',
            output,
            completedAt: new Date(),
          })

          if (traceCtx && nodeSpanId) {
            this.tracer.endSpan(traceCtx, { spanId: nodeSpanId, status: 'ok' })
          }
        } catch (nodeErr) {
          lastFailedNodeId = node.id
          const errorMessage = nodeErr instanceof Error ? nodeErr.message : String(nodeErr)

          // T2.13: fail-fast — update node row, then re-throw
          await this.workflowStore.updateRunNode(runNodeId, {
            status: 'failed',
            errorMessage,
            completedAt: new Date(),
          })

          if (traceCtx && nodeSpanId) {
            this.tracer.endSpan(traceCtx, {
              spanId: nodeSpanId,
              status: 'error',
              statusMessage: errorMessage,
            })
          }

          throw nodeErr // propagate to outer catch
        }
      }

      // All nodes completed
      const durationMs = Date.now() - startedAt
      // T2.16 DECISION: We emit workflow.run.completed and workflow.run.failed audit events
      // but SKIP workflow.run.started. Rationale: at high run frequency, started events are
      // pure noise and duplicate the span info. completed/failed carry the actionable metrics
      // (durationMs, totalTokens, totalCostUsd).

      if (traceCtx && rootSpanId) {
        this.tracer.endSpan(traceCtx, { spanId: rootSpanId, status: 'ok' })
        await this.tracer.finishTrace(traceCtx, { status: 'ok' })
      }

      // T2.30: emit workflow.run.completed audit event (fire-and-forget, non-blocking)
      this.auditStore?.record({
        userId: userId ?? workspaceId,
        eventType: 'workflow.run.completed',
        metadata: {
          runId,
          workflowId,
          workspaceId,
          userId,
          durationMs,
          totalTokens,
          totalCostUsd: totalCostUsd.toFixed(6),
          traceId,
        },
        tokenCount: totalTokens,
        costUsd: totalCostUsd,
      }).catch((err) => console.error('[WorkflowRuntimeUseCase] Failed to record workflow.run.completed audit event:', err))

      return {
        status: 'completed',
        output: workflowOutput,
        totalTokens,
        totalCostUsd: totalCostUsd.toFixed(6),
        traceId,
        durationMs,
      }
    } catch (err) {
      const durationMs = Date.now() - startedAt
      const errorMessage = err instanceof Error ? err.message : String(err)

      if (traceCtx && rootSpanId) {
        this.tracer.endSpan(traceCtx, {
          spanId: rootSpanId,
          status: 'error',
          statusMessage: errorMessage,
        })
        await this.tracer.finishTrace(traceCtx, { status: 'error', statusMessage: errorMessage })
      } else if (traceCtx) {
        await this.tracer.finishTrace(traceCtx, { status: 'error', statusMessage: errorMessage })
      }

      // T2.30: emit workflow.run.failed audit event (fire-and-forget, non-blocking)
      this.auditStore?.record({
        userId: userId ?? workspaceId,
        eventType: 'workflow.run.failed',
        metadata: {
          runId,
          workflowId,
          workspaceId,
          userId,
          durationMs,
          errorNodeId: lastFailedNodeId,
          errorMessage,
          totalTokens,
          totalCostUsd: totalCostUsd.toFixed(6),
          traceId,
        },
        tokenCount: totalTokens,
        costUsd: totalCostUsd,
      }).catch((auditErr) => console.error('[WorkflowRuntimeUseCase] Failed to record workflow.run.failed audit event:', auditErr))

      return {
        status: 'failed',
        errorNodeId: lastFailedNodeId,
        errorMessage,
        totalTokens,
        totalCostUsd: totalCostUsd.toFixed(6),
        traceId,
        durationMs,
      }
    }
  }

  private async executeNode(
    node: WorkflowNode,
    context: NodeContext,
    snapshot: WorkflowDefinition,
    skippedNodes: Set<string>,
    workspaceId: string,
    userId: string | undefined,
    _runId: string,
    traceCtx: TraceContext | undefined,
    nodeSpanId: string | undefined,
  ): Promise<unknown> {
    switch (node.type) {
      case 'input': {
        // T2.11: input node outputs the workflow input payload
        return context.input
      }

      case 'output': {
        // T2.11: output node renders template or passes through upstream output
        const incomingValue = this.getIncomingValue(node.id, snapshot, context)
        if (node.config.template) {
          return resolveOutputTemplate(node.config.template, context.nodeOutputs)
        }
        return incomingValue
      }

      case 'condition': {
        // T2.12: evaluate JSONLogic expression
        const incomingValue = this.getIncomingValue(node.id, snapshot, context)
        const evalContext = { value: incomingValue, ...context.nodeOutputs }
        let parsed: unknown
        try {
          parsed = JSON.parse(node.config.expression)
        } catch {
          throw new Error(
            `Condition node ${node.id}: expression is not valid JSON: ${node.config.expression}`,
          )
        }
        const result = Boolean(jsonLogic.apply(parsed, evalContext))

        // Mark the false-branch targets as skipped
        for (const edge of snapshot.edges) {
          if (edge.source !== node.id) continue
          const shouldSkip = result ? edge.sourceHandle === 'false' : edge.sourceHandle === 'true'
          if (shouldSkip) {
            this.markTransitiveSkips(edge.target, snapshot, skippedNodes)
          }
        }

        return result
      }

      case 'agent': {
        // T2.14: delegate to AgentUseCase.runAgentToCompletion
        const incomingValue = this.getIncomingValue(node.id, snapshot, context)
        const agentNode = snapshot.nodes.find((n) => n.id === node.id)
        const inputTemplate = agentNode?.type === 'agent' ? agentNode.config.inputTemplate : undefined
        const prompt = buildAgentPrompt(inputTemplate, context.nodeOutputs, incomingValue)

        // T2.15: start an agent span as child of node span for trace nesting
        let agentParentSpanId = nodeSpanId
        if (traceCtx && nodeSpanId) {
          const { spanId } = this.tracer.startSpan(traceCtx, {
            name: `agent.node.${node.config.agentId}`,
            kind: 'agent',
            parentSpanId: nodeSpanId,
            attributes: { 'agent.id': node.config.agentId, 'workflow.node.id': node.id },
          })
          agentParentSpanId = spanId
        }

        const agentInput: RunAgentInput = {
          agentId: node.config.agentId,
          messages: [{ role: 'user', content: prompt } as Message],
          configOverrides: node.config.overrides,
          context: {
            workspaceId,
            userId,
            // T2.14: propagate trace context so agent spans nest under the workflow
            __traceId: traceCtx?.traceId,
            __parentSpanId: agentParentSpanId,
          },
        }

        const agentResult = await this.agentUseCase.runAgentToCompletion(agentInput)

        // Close the nested agent span now that agent has completed
        if (traceCtx && agentParentSpanId && agentParentSpanId !== nodeSpanId) {
          this.tracer.endSpan(traceCtx, {
            spanId: agentParentSpanId,
            status: 'ok',
            inputTokens: agentResult.inputTokens,
            outputTokens: agentResult.outputTokens,
            costUsd: agentResult.costUsd,
          })
        }

        return agentResult.text
      }

      default: {
        // Exhaustive check — TypeScript will flag this if a new node type is added
        const _exhaustive: never = node
        throw new Error(`Unknown node type: ${(_exhaustive as WorkflowNode).type}`)
      }
    }
  }

  /**
   * Gets the primary incoming value for a node from the first upstream output.
   * Delegates to the exported pure helper `getIncomingValue`.
   */
  private getIncomingValue(nodeId: string, snapshot: WorkflowDefinition, context: NodeContext): unknown {
    return getIncomingValue(nodeId, snapshot.edges, context.nodeOutputs)
  }

  /**
   * Transitively marks a node and its downstream dependents as skipped.
   * Delegates to the exported pure helper `markTransitiveSkips`.
   */
  private markTransitiveSkips(
    startNodeId: string,
    snapshot: WorkflowDefinition,
    skippedNodes: Set<string>,
  ): void {
    markTransitiveSkips(startNodeId, snapshot.edges, skippedNodes)
  }
}
