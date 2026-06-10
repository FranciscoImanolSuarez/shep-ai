import { TracesList } from '@/components/observability/TracesList'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { StatCard } from '@/components/shared/StatCard'
import { ActivityIcon, AlertCircleIcon, ClockIcon, DollarSignIcon } from 'lucide-react'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

async function getObservabilityStats() {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) return null

  const to = new Date()
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)

  const { observabilityUseCase } = getContainer()

  try {
    const [allTraces, errorTraces] = await Promise.all([
      observabilityUseCase.listTraces({
        workspaceId: ctx.workspace.id,
        startedAfter: from,
        startedBefore: to,
        limit: 200,
      }),
      observabilityUseCase.listTraces({
        workspaceId: ctx.workspace.id,
        status: 'error',
        startedAfter: from,
        startedBefore: to,
        limit: 200,
      }),
    ])

    const completedTraces = allTraces.filter((t) => t.durationMs !== undefined)
    const avgDurationMs =
      completedTraces.length > 0
        ? Math.round(
            completedTraces.reduce((sum, t) => sum + (t.durationMs ?? 0), 0) / completedTraces.length,
          )
        : 0

    const totalCostUsd = allTraces.reduce((sum, t) => sum + parseFloat(t.totalCostUsd ?? '0'), 0)

    return {
      totalTraces: allTraces.length,
      errorCount: errorTraces.length,
      avgDurationMs,
      totalCostUsd,
    }
  } catch {
    return null
  }
}

function formatDurationMs(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export default async function ObservabilityPage() {
  const stats = await getObservabilityStats()

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="INSIGHTS"
        title="Observability"
        description="Trace every agent execution and workflow run with span-level detail."
        variant="default"
        stats={stats ? [
          { label: 'Traces (24h)', value: stats.totalTraces, hint: 'last 24 hours' },
          {
            label: 'Errors (24h)',
            value: stats.errorCount,
            hint: stats.totalTraces > 0
              ? `${Math.round((stats.errorCount / stats.totalTraces) * 100)}% error rate`
              : 'no traces',
          },
        ] : undefined}
      />
      <PageBody className="space-y-6">
        {/* Stats row — last 24h — full detail */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Traces (24h)"
              value={stats.totalTraces}
              icon={ActivityIcon}
              hint="last 24 hours"
            />
            <StatCard
              label="Errors (24h)"
              value={stats.errorCount}
              icon={AlertCircleIcon}
              hint={stats.totalTraces > 0 ? `${Math.round((stats.errorCount / stats.totalTraces) * 100)}% error rate` : 'no traces'}
            />
            <StatCard
              label="Avg duration"
              value={formatDurationMs(stats.avgDurationMs)}
              icon={ClockIcon}
              hint="completed traces"
            />
            <StatCard
              label="Total cost (24h)"
              value={`$${stats.totalCostUsd.toFixed(4)}`}
              icon={DollarSignIcon}
              hint="USD"
            />
          </div>
        )}
        <SectionDivider label="All traces" align="left" />
        <TracesList />
      </PageBody>
    </div>
  )
}
