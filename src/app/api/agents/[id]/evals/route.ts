import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { computeCost } from '@/core/domain/entities/audit-event'

/**
 * P2.1 — Eval surface for an agent.
 *
 * Telemetry (Braintrust traces, per-step spans) is wired up at the runner
 * level via `wrapAISDKModel` and `experimental_telemetry` — every run that
 * happens while `BRAINTRUST_API_KEY` is set shows up in the dashboard
 * automatically; this route does not need to re-push that data.
 *
 * What this returns: aggregated stats over the last N executions so a quick
 * eval can be done from the UI without leaving the app. Replay-based evals
 * (re-running historical inputs with the current agent and grading the diff)
 * are a follow-up — they need cost guardrails and an LLM-as-judge scorer.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { agentUseCase, executionStore } = getContainer()

  const agent = await agentUseCase.getAgent(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const executions = await executionStore.findByAgentId(id, 100)

  const completed = executions.filter((e) => e.status === 'completed')
  const failed = executions.filter((e) => e.status === 'failed')
  const totalRuns = executions.length
  const successRate = totalRuns > 0 ? Math.round((completed.length / totalRuns) * 100) : 0

  // Latency: createdAt → completedAt, in ms. Only completed runs contribute.
  const durations = completed
    .filter((e) => e.completedAt)
    .map((e) => e.completedAt!.getTime() - e.createdAt.getTime())
    .sort((a, b) => a - b)

  const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0
    const idx = Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))
    return arr[idx]
  }

  // Token + cost aggregates
  const totalTokens = completed.reduce((sum, e) => sum + (e.totalTokens ?? 0), 0)
  const avgTokens = completed.length > 0 ? Math.round(totalTokens / completed.length) : 0
  const totalCostUsd = completed.reduce(
    (sum, e) => sum + (computeCost(agent.model, e.totalTokens ?? 0) ?? 0),
    0,
  )

  // Step distribution (how many runs needed N steps)
  const stepHistogram: Record<number, number> = {}
  for (const e of completed) {
    const n = e.steps.length
    stepHistogram[n] = (stepHistogram[n] ?? 0) + 1
  }

  // Top failing tools — which tools errored most often across all runs.
  // A tool result with isError-flavored output we'd need from the trace, but
  // here we approximate with steps that have NO tool calls in a failed run.
  const failureSignals = failed.map((e) => ({
    executionId: e.id,
    steps: e.steps.length,
    createdAt: e.createdAt,
  }))

  const braintrustEnabled = Boolean(process.env.BRAINTRUST_API_KEY)

  return NextResponse.json({
    agentId: id,
    sampleSize: totalRuns,
    successRate,
    failureCount: failed.length,
    avgTokens,
    totalTokens,
    totalCostUsd: totalCostUsd.toFixed(6),
    latencyMs: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    },
    stepHistogram,
    recentFailures: failureSignals.slice(0, 5),
    telemetry: {
      braintrustEnabled,
      // When set, the UI can link to https://www.braintrust.dev/app/<org>/p/<project>
      // for full traces; org slug is per-user so the UI fills it in.
      braintrustProject: process.env.BRAINTRUST_PROJECT ?? 'shep-ai',
    },
  })
}
