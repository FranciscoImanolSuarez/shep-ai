'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { NetworkIcon, PlusIcon, TrashIcon, PencilIcon, PlayIcon } from 'lucide-react'
import type { Workflow } from '@/core/domain/entities/workflow'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
import { WorkflowThumbnail } from '@/components/workflows/WorkflowThumbnail'
import { Alert } from '@/components/shared/Alert'
import { toast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function nodeCount(workflow: Workflow): number {
  return workflow.definition?.nodes?.length ?? 0
}

interface WorkflowStats {
  totalRuns: number
  lastRunAt: string | null
  successRate: number
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function WorkflowStatsRow({ workflowId }: { workflowId: string }) {
  const [stats, setStats] = useState<WorkflowStats | null>(null)

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d) })
      .catch(() => {})
  }, [workflowId])

  if (!stats) return <div className="h-4" />

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{stats.totalRuns} run{stats.totalRuns !== 1 ? 's' : ''}</span>
      {stats.totalRuns > 0 && (
        <>
          <span>·</span>
          <span>{stats.successRate}% success</span>
          <span>·</span>
          <span>last {relativeTime(stats.lastRunAt)}</span>
        </>
      )}
    </div>
  )
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null)

  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workflows')
      if (!res.ok) throw new Error(`Failed to load workflows: ${res.status}`)
      const data = await res.json()
      setWorkflows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows])

  async function handleNew() {
    setCreating(true)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Untitled workflow',
          description: '',
          definition: {
            nodes: [
              { id: 'input-1', type: 'input', position: { x: 50, y: 200 }, config: {} },
              { id: 'output-1', type: 'output', position: { x: 600, y: 200 }, config: {} },
            ],
            edges: [],
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Failed to create workflow: ${res.status}`)
        return
      }
      const workflow = await res.json()
      router.push(`/workflows/${workflow.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow')
    } finally {
      setCreating(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeletingId(id)
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? `Failed to delete workflow: ${res.status}`)
        return
      }
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success('Workflow deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete workflow')
    } finally {
      setDeletingId(null)
    }
  }

  const newButton = (
    <button
      onClick={handleNew}
      disabled={creating}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium shadow-sm hover:bg-foreground/90 transition-colors disabled:opacity-40"
    >
      <PlusIcon className="size-4" />
      {creating ? 'Creating…' : 'New workflow'}
    </button>
  )

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="AUTOMATE"
        title="Workflows"
        accent="Workflows"
        description="Build visual agent flows. Connect inputs, agents, conditions and outputs."
        variant="default"
        actions={newButton}
        stats={workflows.length > 0 ? [
          { label: 'Workflows', value: workflows.length },
          {
            label: 'Nodes total',
            value: workflows.reduce(
              (sum, w) => sum + (w.definition?.nodes?.length ?? 0),
              0,
            ),
          },
        ] : undefined}
      />

      <PageBody className="space-y-6">
        {/* Error banner */}
        {error && (
          <Alert variant="danger" description={error} onDismiss={() => setError(null)} />
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={NetworkIcon}
            title="No workflows yet"
            description="Create your first workflow to start connecting agents visually."
            action={
              <button
                onClick={handleNew}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <PlusIcon className="size-3.5" />
                {creating ? 'Creating…' : 'New workflow'}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate">{wf.name}</span>
                    {!wf.enabled && <Badge variant="muted">disabled</Badge>}
                  </div>
                  <Badge variant="muted">{nodeCount(wf)} nodes</Badge>
                </div>

                {/* Thumbnail */}
                <WorkflowThumbnail definition={wf.definition} width={240} height={80} />

                {/* Description */}
                {wf.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{wf.description}</p>
                )}

                {/* Stats */}
                <WorkflowStatsRow workflowId={wf.id} />

                {/* Footer */}
                <div className="flex items-center gap-1 pt-2 border-t border-border mt-auto">
                  <span className="text-xs text-muted-foreground flex-1">{formatDate(wf.updatedAt)}</span>
                  <button
                    onClick={() => router.push(`/workflows/${wf.id}/runs`)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="View runs"
                  >
                    <PlayIcon className="size-3.5" />
                  </button>
                  <button
                    onClick={() => router.push(`/workflows/${wf.id}/edit`)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit workflow"
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(wf)}
                    disabled={deletingId === wf.id}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                    title="Delete workflow"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Delete workflow"
        description={
          <>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone. All run history will be preserved.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={!!deletingId}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
