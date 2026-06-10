'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeftIcon, NetworkIcon, ExternalLinkIcon } from 'lucide-react'
import type { WorkflowRun, WorkflowRunStatus } from '@/core/domain/entities/workflow-run'
import { Alert } from '@/components/shared/Alert'

function StatusBadge({ status }: { status: WorkflowRunStatus }) {
  const map: Record<WorkflowRunStatus, string> = {
    running: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {status}
    </span>
  )
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
    setLoading(true)
    setError(null)

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
        setRuns(Array.isArray(runsData) ? runsData : [])
        if (workflowData?.name) setWorkflowName(workflowData.name)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load runs'))
      .finally(() => setLoading(false))
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

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Link
            href="/workflows"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeftIcon className="size-3.5" />
            Workflows
          </Link>
          {workflowName && (
            <>
              <span className="text-muted-foreground/40 text-xs">/</span>
              <Link
                href={`/workflows/${id}/edit`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {workflowName}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NetworkIcon className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Runs</h1>
            <p className="text-sm text-muted-foreground">
              Execution history for this workflow — click a trace to debug
            </p>
          </div>
          <div className="ml-auto">
            <Link
              href={`/workflows/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors"
            >
              Edit workflow
            </Link>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Alert variant="danger" description={error} />
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <NetworkIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No runs yet</p>
          <Link
            href={`/workflows/${id}/edit`}
            className="text-sm text-primary hover:underline"
          >
            Open the editor to run this workflow →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Started</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Error</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground text-right">Trace</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
