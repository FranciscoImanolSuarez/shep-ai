'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
import { CronInput } from '@/components/shared/forms/CronInput'
import { toast } from '@/components/shared/Toast'

interface AgentData {
  id: string
  name: string
  provider: string
  model: string
}

interface ScheduleData {
  id: string
  agentId: string
  cronExpression: string
  input: Record<string, unknown>
  enabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  lastRunAt?: string
  nextRunAt: string
  createdAt: string
}

interface RunData {
  id: string
  scheduledAgentId: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  errorMessage?: string
  totalTokens: number
  durationMs?: number
  triggeredBy: string
  createdAt: string
  completedAt?: string
}

function RunStatusBadge({ status }: { status: RunData['status'] }) {
  const variantMap: Record<RunData['status'], 'info' | 'success' | 'danger'> = {
    running: 'info',
    completed: 'success',
    failed: 'danger',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return <Badge variant={enabled ? 'success' : 'muted'}>{enabled ? 'enabled' : 'disabled'}</Badge>
}

function formatDuration(ms?: number) {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatRelative(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

function RunRow({ run }: { run: RunData }) {
  const [open, setOpen] = useState(false)
  const hasPreview = Boolean(run.result || run.errorMessage)

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
        <RunStatusBadge status={run.status} />
        <span className="text-muted-foreground text-xs">{run.triggeredBy}</span>
        <span className="text-muted-foreground text-xs ml-auto">{formatRelative(run.createdAt)}</span>
        <span className="text-muted-foreground text-xs w-14 text-right">{formatDuration(run.durationMs)}</span>
        <span className="text-muted-foreground text-xs w-16 text-right">{run.totalTokens > 0 ? `${run.totalTokens} tok` : ''}</span>
        {hasPreview && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1 rounded hover:bg-accent text-muted-foreground"
          >
            {open ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
          </button>
        )}
      </div>
      {open && hasPreview && (
        <pre className="text-[11px] bg-secondary rounded-md mx-4 mb-3 p-2 whitespace-pre-wrap max-h-40 overflow-auto">
          {run.result ?? run.errorMessage}
        </pre>
      )}
    </div>
  )
}

function RunStatusDots({ scheduleId }: { scheduleId: string }) {
  const [lastRuns, setLastRuns] = useState<RunData[]>([])

  useEffect(() => {
    fetch(`/api/scheduled-agents/${scheduleId}`)
      .then((r) => r.ok ? r.json() : { runs: [] })
      .then((d) => setLastRuns((d.runs ?? []).slice(0, 5)))
      .catch(() => {})
  }, [scheduleId])

  if (lastRuns.length === 0) return null

  return (
    <div className="flex items-center gap-0.5" title="Last 5 runs">
      {lastRuns.map((run) => (
        <span
          key={run.id}
          className={`inline-block size-2 rounded-full ${
            run.status === 'completed' ? 'bg-green-500' :
            run.status === 'failed' ? 'bg-destructive' :
            'bg-yellow-500'
          }`}
        />
      ))}
    </div>
  )
}

function ScheduleRow({
  schedule,
  agents,
  onToggle,
  onRun,
  onDelete,
}: {
  schedule: ScheduleData
  agents: AgentData[]
  onToggle: (id: string, enabled: boolean) => void
  onRun: (id: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [runs, setRuns] = useState<RunData[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [running, setRunning] = useState(false)
  const agentName = agents.find((a) => a.id === schedule.agentId)?.name ?? schedule.agentId

  useEffect(() => {
    if (!expanded) return
    setLoadingRuns(true)
    fetch(`/api/scheduled-agents/${schedule.id}`)
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .finally(() => setLoadingRuns(false))
  }, [expanded, schedule.id])

  async function handleRun() {
    setRunning(true)
    try {
      await onRun(schedule.id)
      if (expanded) {
        const res = await fetch(`/api/scheduled-agents/${schedule.id}`)
        const d = await res.json()
        setRuns(d.runs ?? [])
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 text-[13px]">
        <ClockIcon className="size-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{agentName}</p>
          <p className="text-xs text-muted-foreground font-mono">{schedule.cronExpression}</p>
        </div>
        <EnabledBadge enabled={schedule.enabled} />
        <RunStatusDots scheduleId={schedule.id} />
        <span className="text-xs text-muted-foreground hidden sm:block">
          next: {new Date(schedule.nextRunAt).toLocaleString()}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(schedule.id, !schedule.enabled)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={schedule.enabled ? 'Disable' : 'Enable'}
          >
            {schedule.enabled
              ? <ToggleRightIcon className="size-4 text-primary" strokeWidth={1.5} />
              : <ToggleLeftIcon className="size-4" strokeWidth={1.5} />}
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Run now"
          >
            <PlayIcon className="size-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => onDelete(schedule.id)}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <TrashIcon className="size-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Last 20 runs
          </p>
          {loadingRuns ? (
            <div className="space-y-2 px-4 py-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No runs yet.</div>
          ) : (
            <div>
              {runs.map((run) => <RunRow key={run.id} run={run} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleData[]>([])
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const [formAgentId, setFormAgentId] = useState('')
  const [formCron, setFormCron] = useState('0 9 * * 1')
  const [formInput, setFormInput] = useState('{}')
  const [formNotifySuccess, setFormNotifySuccess] = useState(false)
  const [formNotifyFailure, setFormNotifyFailure] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/scheduled-agents').then((r) => r.json()),
      fetch('/api/agents').then((r) => r.json()),
    ])
      .then(([sd, ag]) => {
        setSchedules(sd.schedules ?? [])
        setAgents(ag.agents ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    let parsedInput: Record<string, unknown> = {}
    try {
      parsedInput = JSON.parse(formInput)
    } catch {
      setFormError('Input must be valid JSON')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/scheduled-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: formAgentId,
          cronExpression: formCron,
          input: parsedInput,
          enabled: true,
          notifyOnSuccess: formNotifySuccess,
          notifyOnFailure: formNotifyFailure,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to create schedule')
        return
      }
      setOpen(false)
      refresh()
      toast.success('Schedule created')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/scheduled-agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, enabled } : s))
  }

  async function handleRun(id: string) {
    await fetch(`/api/scheduled-agents/${id}/run`, { method: 'POST' })
    refresh()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/scheduled-agents/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete schedule')
      return
    }
    setSchedules((prev) => prev.filter((s) => s.id !== id))
    toast.success('Schedule deleted')
  }

  const newScheduleButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="size-3.5" strokeWidth={2} />
            New schedule
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New schedule</DialogTitle>
        </DialogHeader>
        <form id="create-schedule" onSubmit={handleCreate} className="space-y-4 mt-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Agent</p>
            <select
              required
              value={formAgentId}
              onChange={(e) => setFormAgentId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Select an agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.provider}/{a.model})</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Cron expression</p>
            <CronInput value={formCron} onChange={setFormCron} placeholder="0 9 * * 1" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Standard 5-part cron: minute hour day month weekday. E.g. <code>0 9 * * 1</code> = every Monday at 09:00 UTC.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Input payload (JSON)</p>
            <textarea
              value={formInput}
              onChange={(e) => setFormInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-none"
              placeholder="{}"
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formNotifySuccess}
                onChange={(e) => setFormNotifySuccess(e.target.checked)}
              />
              Notify on success
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formNotifyFailure}
                onChange={(e) => setFormNotifyFailure(e.target.checked)}
              />
              Notify on failure
            </label>
          </div>
          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-schedule" size="sm" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Hero
        eyebrow="AUTOMATE"
        title="Schedules"
        description="Run agents on a cron schedule. Track next run times and recent activity."
        variant="default"
        actions={newScheduleButton}
        stats={schedules.length > 0 ? [
          { label: 'Active', value: schedules.filter((s) => s.enabled).length },
          { label: 'Total', value: schedules.length },
        ] : undefined}
      />

      <PageBody className="space-y-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={ClockIcon}
            title="No schedules yet"
            description="Set up a cron schedule to run agents automatically."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                <PlusIcon className="size-3.5" />
                Create your first schedule
              </Button>
            }
          />
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border">
              <span />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Agent / Cron</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:block">Next run</span>
              <span />
            </div>
            {schedules.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                agents={agents}
                onToggle={handleToggle}
                onRun={handleRun}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </PageBody>
    </div>
  )
}
