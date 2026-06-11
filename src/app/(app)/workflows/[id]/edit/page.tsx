'use client'

// ADR-5: WorkflowCanvas MUST be imported via next/dynamic with ssr:false only.
// @xyflow/react uses ResizeObserver and DOM refs at module load time — SSR would break.

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ChevronLeftIcon, NetworkIcon } from 'lucide-react'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'
import type { Workflow } from '@/core/domain/entities/workflow'
import type { WorkflowCanvasProps } from '@/components/workflows/WorkflowCanvas'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Spinner } from '@/components/shared/Spinner'

// T2.28: dynamic import with ssr:false — xyflow never runs on the server
const WorkflowCanvas = dynamic<WorkflowCanvasProps>(
  () => import('@/components/workflows/WorkflowCanvas').then((m) => m.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading canvas…
      </div>
    ),
  },
)

export default function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetch(`/api/workflows/${id}`)
      .then((r) => {
        if (r.status === 404) throw new Error('Workflow not found')
        if (!r.ok) throw new Error(`Failed to load workflow: ${r.status}`)
        return r.json()
      })
      .then((data: Workflow) => {
        setWorkflow(data)
        setName(data.name)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workflow'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(definition: WorkflowDefinition): Promise<void> {
    const res = await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Save failed: ${res.status}`)
    }
    const updated = await res.json()
    setWorkflow(updated)
  }

  async function handleRun(input: Record<string, unknown>): Promise<{ runId: string }> {
    const res = await fetch(`/api/workflows/${id}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Run failed: ${res.status}`)
    }
    const data = await res.json()
    return { runId: data.runId }
  }

  async function handleNameSave() {
    if (!name.trim() || name === workflow?.name) {
      setEditingName(false)
      return
    }
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setWorkflow(updated)
        setName(updated.name)
      }
    } catch {
      // non-fatal — keep local state
    } finally {
      setEditingName(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <EmptyState
          icon={NetworkIcon}
          title={error ?? 'Workflow not found'}
          description="The workflow may have been deleted or you may not have access."
          action={
            <Button size="sm" render={<Link href="/workflows" />}>
              Back to workflows
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background shrink-0">
        <button
          onClick={() => router.push('/workflows')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeftIcon className="size-3.5" />
          Workflows
        </button>
        <span className="text-muted-foreground/40">/</span>
        {editingName ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setName(workflow.name); setEditingName(false) } }}
            autoFocus
            className="text-sm font-medium bg-background border-b border-border focus:outline-none px-1 min-w-0"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-medium hover:text-foreground/70 transition-colors"
            title="Click to rename"
          >
            {workflow.name}
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/workflows/${id}/runs`} />}
          >
            View runs
          </Button>
        </div>
      </div>

      {/* Canvas takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          workflowId={id}
          initialDefinition={workflow.definition}
          onSave={handleSave}
          onRun={handleRun}
        />
      </div>
    </div>
  )
}
