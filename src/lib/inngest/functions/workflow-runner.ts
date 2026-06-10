import { randomUUID } from 'crypto'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsonLogic = require('json-logic-js') as { apply: (rule: unknown, data: unknown) => unknown }
import { inngest, WORKFLOW_EXECUTE_REQUESTED } from '../client'
import type { WorkflowExecuteRequestedData } from '../client'
import { getContainer } from '@/config/container'
import { topologicalSort } from '@/core/usecases/workflow-dag'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'
import type { WorkflowNode } from '@/core/domain/entities/workflow-node'
import type { Message } from '@/core/domain/entities/message'

/**
 * P2.2 — Durable workflow executor.
 *
 * Each node runs inside its own `step.run`. Inngest:
 *  - persists the return value of each step, so a server restart resumes from
 *    the last completed node (no re-execution of completed work)
 *  - retries failed steps independently (3 attempts by default)
 *  - decouples the long-running workflow from the HTTP request that triggered it
 *
 * The trace context, node outputs, and skip set are threaded through step
 * returns instead of in-memory state because steps run in independent function
 * invocations on serverless.
 */
export const workflowRunner = inngest.createFunction(
  {
    id: 'workflow-runner',
    retries: 3,
    triggers: [{ event: WORKFLOW_EXECUTE_REQUESTED }],
  },
  async ({ event, step }) => {
    const { runId, workspaceId, userId, workflowId, snapshot, input } =
      event.data as WorkflowExecuteRequestedData
    const startedAt = Date.now()

    // Each step.run callback resolves dependencies via the container so the
    // closure captured by Inngest stays serializable (no class refs).

    // ── Start trace ──────────────────────────────────────────────────────
    const traceInfo = await step.run('start-trace', async () => {
      const { tracer } = getContainer()
      try {
        const ctx = await tracer.startTrace({
          workspaceId,
          rootKind: 'workflow',
          workflowRunId: runId,
          attributes: { 'workflow.id': workflowId, 'workflow.run.id': runId },
        })
        const { spanId } = tracer.startSpan(ctx, {
          name: `workflow.${workflowId}`,
          kind: 'workflow',
          attributes: { 'workflow.id': workflowId, 'workflow.run.id': runId },
        })
        return { traceId: ctx.traceId, rootSpanId: spanId }
      } catch (err) {
        console.error('[workflow-runner] start-trace failed', err)
        return { traceId: undefined as string | undefined, rootSpanId: undefined as string | undefined }
      }
    })

    const traceCtx = traceInfo.traceId ? { traceId: traceInfo.traceId, workspaceId } : undefined
    const orderedNodes = topologicalSort(snapshot.nodes, snapshot.edges)

    let nodeOutputs: Record<string, unknown> = {}
    let skippedNodes: string[] = []
    let workflowOutput: Record<string, unknown> | undefined
    let lastFailedNodeId: string | undefined
    let failureMessage: string | undefined

    for (const node of orderedNodes) {
      if (skippedNodes.includes(node.id)) {
        await step.run(`skip-${node.id}`, async () => {
          const { workflowStore } = getContainer()
          await workflowStore.insertRunNode({
            id: randomUUID(),
            workflowRunId: runId,
            nodeId: node.id,
            nodeType: node.type,
            status: 'skipped',
          })
        })
        continue
      }

      try {
        // Per-node step — Inngest persists this return value so a crash mid-run
        // doesn't replay completed nodes.
        const stepResult = await step.run(`node-${node.id}`, async () => {
          return executeNodeStep({
            node,
            snapshot,
            runId,
            workspaceId,
            userId,
            input,
            nodeOutputs,
            traceInfo,
          })
        })

        nodeOutputs = { ...nodeOutputs, [node.id]: stepResult.output }
        if (stepResult.skipDownstream.length > 0) {
          skippedNodes = [...skippedNodes, ...stepResult.skipDownstream]
        }
        if (node.type === 'output') {
          workflowOutput = { ...workflowOutput, [node.id]: stepResult.output }
        }
      } catch (err) {
        lastFailedNodeId = node.id
        failureMessage = err instanceof Error ? err.message : String(err)
        // Don't rethrow — let the finalize step record the failure cleanly.
        break
      }
    }

    // ── Finalize ─────────────────────────────────────────────────────────
    const durationMs = Date.now() - startedAt
    const succeeded = !lastFailedNodeId

    await step.run('finalize', async () => {
      const { tracer, auditStore } = getContainer()
      if (traceCtx && traceInfo.rootSpanId) {
        tracer.endSpan(traceCtx, {
          spanId: traceInfo.rootSpanId,
          status: succeeded ? 'ok' : 'error',
          statusMessage: failureMessage,
        })
        await tracer.finishTrace(traceCtx, {
          status: succeeded ? 'ok' : 'error',
          statusMessage: failureMessage,
        })
      }
      void auditStore?.record({
        userId: workspaceId,
        eventType: succeeded ? 'workflow.run.completed' : 'workflow.run.failed',
        metadata: {
          runId,
          workflowId,
          workspaceId,
          userId,
          durationMs,
          errorNodeId: lastFailedNodeId,
          errorMessage: failureMessage,
          traceId: traceInfo.traceId,
        },
        tokenCount: 0,
        costUsd: 0,
      }).catch((auditErr) => console.error('[workflow-runner] audit record failed', auditErr))

      // Persist final run row state — the inline executor used to do this via
      // WorkflowUseCase; in durable mode the function owns it.
      const { workflowStore } = getContainer()
      await workflowStore.updateRun(runId, {
        status: succeeded ? 'completed' : 'failed',
        output: workflowOutput,
        errorNodeId: lastFailedNodeId,
        errorMessage: failureMessage,
        traceId: traceInfo.traceId,
        durationMs,
        completedAt: new Date(),
      })
    })

    return {
      runId,
      status: succeeded ? 'completed' : 'failed',
      output: workflowOutput,
      errorNodeId: lastFailedNodeId,
      errorMessage: failureMessage,
      durationMs,
      traceId: traceInfo.traceId,
    }
  },
)

interface ExecuteNodeStepInput {
  node: WorkflowNode
  snapshot: WorkflowDefinition
  runId: string
  workspaceId: string
  userId?: string
  input: Record<string, unknown>
  nodeOutputs: Record<string, unknown>
  traceInfo: { traceId?: string; rootSpanId?: string }
}

interface ExecuteNodeStepResult {
  output: unknown
  // Node ids that downstream branches should mark as skipped (used by conditions)
  skipDownstream: string[]
}

/**
 * Pure-ish per-node execution. Lives outside the Inngest function body so it
 * can be unit-tested and reused. Re-resolves stores via `getContainer()` to
 * avoid serializing class instances into Inngest step state.
 */
async function executeNodeStep({
  node,
  snapshot,
  runId,
  workspaceId,
  userId,
  input,
  nodeOutputs,
  traceInfo,
}: ExecuteNodeStepInput): Promise<ExecuteNodeStepResult> {
  const { tracer, workflowStore, agentUseCase } = getContainer()
  const traceCtx = traceInfo.traceId ? { traceId: traceInfo.traceId, workspaceId } : undefined

  // Per-node span (child of root)
  let nodeSpanId: string | undefined
  if (traceCtx && traceInfo.rootSpanId) {
    const { spanId } = tracer.startSpan(traceCtx, {
      name: `workflow_node.${node.type}:${node.id}`,
      kind: 'workflow_node',
      parentSpanId: traceInfo.rootSpanId,
      attributes: { 'workflow.node.id': node.id, 'workflow.node.type': node.type },
    })
    nodeSpanId = spanId
  }

  // Running row
  const runNodeId = randomUUID()
  await workflowStore.insertRunNode({
    id: runNodeId,
    workflowRunId: runId,
    nodeId: node.id,
    nodeType: node.type,
    status: 'running',
    spanId: nodeSpanId,
    startedAt: new Date(),
  })

  try {
    const { output, skipDownstream } = await runNodeBody({
      node,
      snapshot,
      input,
      nodeOutputs,
      workspaceId,
      userId,
      agentUseCase,
      tracer,
      traceCtx,
      nodeSpanId,
    })

    await workflowStore.updateRunNode(runNodeId, {
      status: 'completed',
      output,
      completedAt: new Date(),
    })
    if (traceCtx && nodeSpanId) {
      tracer.endSpan(traceCtx, { spanId: nodeSpanId, status: 'ok' })
    }

    return { output, skipDownstream }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await workflowStore.updateRunNode(runNodeId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    })
    if (traceCtx && nodeSpanId) {
      tracer.endSpan(traceCtx, { spanId: nodeSpanId, status: 'error', statusMessage: errorMessage })
    }
    throw err
  }
}

interface RunNodeBodyInput {
  node: WorkflowNode
  snapshot: WorkflowDefinition
  input: Record<string, unknown>
  nodeOutputs: Record<string, unknown>
  workspaceId: string
  userId?: string
  agentUseCase: ReturnType<typeof getContainer>['agentUseCase']
  tracer: ReturnType<typeof getContainer>['tracer']
  traceCtx?: { traceId: string; workspaceId: string }
  nodeSpanId?: string
}

async function runNodeBody({
  node,
  snapshot,
  input,
  nodeOutputs,
  workspaceId,
  userId,
  agentUseCase,
  tracer,
  traceCtx,
  nodeSpanId,
}: RunNodeBodyInput): Promise<{ output: unknown; skipDownstream: string[] }> {
  switch (node.type) {
    case 'input':
      return { output: input, skipDownstream: [] }

    case 'output': {
      const incomingValue = getIncomingValue(node.id, snapshot, nodeOutputs)
      if (node.config.template) {
        const rendered = node.config.template.replace(/\{\{(\w+)\}\}/g, (_m: string, id: string) => {
          const v = nodeOutputs[id]
          return v !== undefined ? String(v) : ''
        })
        return { output: rendered, skipDownstream: [] }
      }
      return { output: incomingValue, skipDownstream: [] }
    }

    case 'condition': {
      const incomingValue = getIncomingValue(node.id, snapshot, nodeOutputs)
      const evalContext = { value: incomingValue, ...nodeOutputs }
      let parsed: unknown
      try {
        parsed = JSON.parse(node.config.expression)
      } catch {
        throw new Error(`Condition node ${node.id}: expression is not valid JSON: ${node.config.expression}`)
      }
      const result = Boolean(jsonLogic.apply(parsed, evalContext))

      const skipDownstream: string[] = []
      for (const edge of snapshot.edges) {
        if (edge.source !== node.id) continue
        const shouldSkip = result ? edge.sourceHandle === 'false' : edge.sourceHandle === 'true'
        if (shouldSkip) {
          collectTransitiveSkips(edge.target, snapshot, skipDownstream)
        }
      }
      return { output: result, skipDownstream }
    }

    case 'agent': {
      const incomingValue = getIncomingValue(node.id, snapshot, nodeOutputs)
      const prompt = buildAgentPrompt(node.id, snapshot, nodeOutputs, incomingValue)

      let agentParentSpanId = nodeSpanId
      if (traceCtx && nodeSpanId) {
        const { spanId } = tracer.startSpan(traceCtx, {
          name: `agent.node.${node.config.agentId}`,
          kind: 'agent',
          parentSpanId: nodeSpanId,
          attributes: { 'agent.id': node.config.agentId, 'workflow.node.id': node.id },
        })
        agentParentSpanId = spanId
      }

      const agentResult = await agentUseCase.runAgentToCompletion({
        agentId: node.config.agentId,
        messages: [{ role: 'user', content: prompt } as Message],
        configOverrides: node.config.overrides,
        context: {
          workspaceId,
          userId,
          __traceId: traceCtx?.traceId,
          __parentSpanId: agentParentSpanId,
        },
      })

      if (traceCtx && agentParentSpanId && agentParentSpanId !== nodeSpanId) {
        tracer.endSpan(traceCtx, {
          spanId: agentParentSpanId,
          status: 'ok',
          inputTokens: agentResult.inputTokens,
          outputTokens: agentResult.outputTokens,
          costUsd: agentResult.costUsd,
        })
      }
      return { output: agentResult.text, skipDownstream: [] }
    }

    default: {
      const _exhaustive: never = node
      throw new Error(`Unknown node type: ${(_exhaustive as WorkflowNode).type}`)
    }
  }
}

function getIncomingValue(
  nodeId: string,
  snapshot: WorkflowDefinition,
  nodeOutputs: Record<string, unknown>,
): unknown {
  const incoming = snapshot.edges.filter((e) => e.target === nodeId)
  if (incoming.length === 0) return undefined
  if (incoming.length === 1) return nodeOutputs[incoming[0].source]
  const result: Record<string, unknown> = {}
  for (const edge of incoming) result[edge.source] = nodeOutputs[edge.source]
  return result
}

function buildAgentPrompt(
  nodeId: string,
  snapshot: WorkflowDefinition,
  nodeOutputs: Record<string, unknown>,
  incomingValue: unknown,
): string {
  const node = snapshot.nodes.find((n) => n.id === nodeId)
  if (node?.type === 'agent' && node.config.inputTemplate) {
    return node.config.inputTemplate.replace(/\{\{(\w+)\}\}/g, (_m: string, id: string) => {
      const v = nodeOutputs[id]
      return v !== undefined ? String(v) : ''
    })
  }
  if (incomingValue === undefined) return ''
  if (typeof incomingValue === 'string') return incomingValue
  return JSON.stringify(incomingValue)
}

function collectTransitiveSkips(
  startNodeId: string,
  snapshot: WorkflowDefinition,
  out: string[],
): void {
  const seen = new Set<string>(out)
  const stack = [startNodeId]
  while (stack.length > 0) {
    const nodeId = stack.pop()!
    if (seen.has(nodeId)) continue
    seen.add(nodeId)
    out.push(nodeId)
    for (const edge of snapshot.edges) {
      if (edge.source !== nodeId) continue
      const incomingToTarget = snapshot.edges.filter((e) => e.target === edge.target)
      const allIncomingSkipped = incomingToTarget.every((e) => seen.has(e.source))
      if (allIncomingSkipped) stack.push(edge.target)
    }
  }
}
