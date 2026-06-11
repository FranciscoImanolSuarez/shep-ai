'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NetworkIcon, ExternalLinkIcon, ArrowLeftIcon } from 'lucide-react'
import type { WorkflowRun, WorkflowRunStatus } from '@/core/domain/entities/workflow-run'
import { Alert } from '@/components/shared/Alert'
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'

const STATUS_VARIANT: Record<WorkflowRunStatus, 'warning' | 'success' | 'danger'> = {
  running: 'warning',
  completed: 'success',
  failed: 'danger',
}

function StatusBadge({ status }: { status: WorkflowRunStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

function formatDuration(ms?: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WorkflowRunsPage() {
  const { id } = useParams<{ id: string }>()
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workflowName, setWorkflowName] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetchRuns = (): Promise<WorkflowRun[]> =>
      fetch(`/api/workflows/${id}/runs`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load runs: ${r.status}`)
        return r.json()
      })

    Promise.all([
      fetchRuns(),
      fetch(`/api/workflows/${id}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([runsData, workflowData]) => {
        if (cancelled) return
        setRuns(Array.isArray(runsData) ? runsData : [])
        setError(null)
        if (workflowData?.name) setWorkflowName(workflowData.name)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load runs')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  // P2.2 — when WORKFLOW_EXECUTOR=inngest, POST /runs returns immediately with
  // status='running' and the Inngest worker updates the row in the background.
  // Poll while ANY run is still running so the UI converges to its final state
  // without forcing a manual refresh. Polling stops as soon as every run is
  // either completed or failed.
  useEffect(() => {
    if (!id) return
    const hasRunning = runs.some((r) => r.status === 'running')
    if (!hasRunning) return

    const interval = setInterval(async () => {
      try {
        const fresh = await fetch(`/api/workflows/${id}/runs`).then((r) => r.json())
        if (Array.isArray(fresh)) setRuns(fresh)
      } catch {
        // Best-effort — keep the previous list on transient failures
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [id, runs])

  const backAction = (
    <Button variant="ghost" size="sm" render={<Link href={`/workflows/${id}/edit`} />}>
      <ArrowLeftIcon className="size-3.5" />
      Back to editor
    </Button>
  )

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="BUILD"
        title={workflowName ? `${workflowName} runs` : 'Runs'}
        description="Execution history for this workflow — click a trace to debug"
        variant="default"
        actions={backAction}
        stats={runs.length > 0 ? [{ label: 'Total runs', value: runs.length }] : undefined}
      />

      <PageBody className="space-y-6">
        {/* Error banner */}
        {error && <Alert variant="danger" description={error} />}

        <DataTable
          headers={['Status', 'Started', 'Duration', 'Error', 'Trace']}
          loading={loading}
          loadingRows={4}
          empty={
            runs.length === 0 && !loading ? (
              <EmptyState
                icon={NetworkIcon}
                title="No runs yet"
                description="Open the editor to trigger your first workflow run."
                action={
                  <Button size="sm" render={<Link href={`/workflows/${id}/edit`} />}>
                    Open editor
                  </Button>
                }
              />
            ) : undefined
          }
        >
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                {formatDate(run.startedAt)}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                {formatDuration(run.durationMs)}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate hidden lg:table-cell">
                {run.errorMessage ?? '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {run.traceId ? (
                  <Link
                    href={`/observability/${run.traceId}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    title="View trace in Observability"
                  >
                    <ExternalLinkIcon className="size-3" />
                    Trace
                  </Link>
                ) : (
                  <span
                    className="text-xs text-muted-foreground cursor-not-allowed"
                    title="Trace unavailable"
                  >
                    No trace
                  </span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </PageBody>
    </div>
  )
}
