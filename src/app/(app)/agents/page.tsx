'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BotIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  UploadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  CopyIcon,
  SearchIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AGENT_CATEGORIES } from '@/core/domain/entities/published-agent'
import { AgentConfigFields, type AgentConfigValues } from '@/components/agents/AgentConfigFields'
import { AgentBasicFields, type AgentBasicValues } from '@/components/agents/AgentBasicFields'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Spinner } from '@/components/shared/Spinner'
import { AgentAvatar } from '@/components/ai/AgentAvatar'
import { ModelBadge } from '@/components/ai/ModelBadge'
import { toast } from '@/components/shared/Toast'

interface AgentData {
  id: string
  name: string
  description: string
  systemPrompt: string
  model: string
  provider: 'openai' | 'anthropic' | 'ollama'
  toolIds: string[]
  knowledgeBaseId?: string | null
  config: { maxSteps: number; temperature: number; toolChoice: 'auto' | 'required' | 'none' }
  createdAt: string
}

interface AgentExecution {
  id: string
  agentId: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  totalTokens?: number
  createdAt: string
  parentExecutionId?: string
}

interface AgentStats {
  totalRuns: number
  lastRunAt: string | null
  successRate: number
}

interface AgentUsage {
  workflows: { id: string; name: string }[]
  schedules: { id: string; cronExpression: string }[]
}

interface PublishForm {
  category: string
  tags: string
  description: string
}

const DEFAULT_ADV_CONFIG: AgentConfigValues = {
  maxSteps: 10,
  temperature: 0.7,
  toolChoice: 'auto',
  maxDelegationDepth: 3,
  tokenBudget: null,
  memoryEnabled: false,
}

const DEFAULT_BASIC: AgentBasicValues = {
  name: '',
  description: '',
  systemPrompt: '',
  provider: 'openai',
  model: 'gpt-4o-mini',
  toolIds: [],
  knowledgeBaseId: null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function StatusBadge({ status }: { status: AgentExecution['status'] }) {
  const variantMap: Record<AgentExecution['status'], 'warning' | 'success' | 'danger'> = {
    running: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

function ChildExecutionCard({
  execution,
  agents,
}: {
  execution: AgentExecution
  agents: AgentData[]
}) {
  const [open, setOpen] = useState(false)
  const agentName = agents.find((a) => a.id === execution.agentId)?.name ?? execution.agentId

  return (
    <div className="ml-4 border-l-2 border-border pl-3">
      <div
        className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-foreground text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRightIcon className={`size-3 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
        <span className="text-xs font-medium truncate">{agentName}</span>
        <StatusBadge status={execution.status} />
        {execution.totalTokens != null && (
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{execution.totalTokens} tokens</span>
        )}
      </div>
      {open && execution.result && (
        <pre className="text-[11px] bg-secondary rounded-md p-2 whitespace-pre-wrap max-h-40 overflow-auto mt-1 mb-2">
          {execution.result.slice(0, 200)}{execution.result.length > 200 ? '…' : ''}
        </pre>
      )}
    </div>
  )
}

function AgentStatsRow({ agentId }: { agentId: string }) {
  const [stats, setStats] = useState<AgentStats | null>(null)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d) })
      .catch(() => {})
  }, [agentId])

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

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  agents,
  isPublished,
  onDelete,
  onPublish,
  onClone,
  onRun,
}: {
  agent: AgentData
  agents: AgentData[]
  isPublished: boolean
  onDelete: (id: string) => void
  onPublish: (agent: AgentData) => void
  onClone: (agent: AgentData) => void
  onRun: (agentId: string, input: string) => Promise<{ output: string; children: AgentExecution[]; totalTokens?: number; steps?: number }>
}) {
  const [expanded, setExpanded] = useState(false)
  const [runInput, setRunInput] = useState('')
  const [runOutput, setRunOutput] = useState('')
  const [runningId, setRunningId] = useState(false)
  const [runMeta, setRunMeta] = useState<{ tokens?: number; steps?: number } | null>(null)
  const [childExecutions, setChildExecutions] = useState<AgentExecution[]>([])

  const subAgentIds = agent.toolIds.filter((t) => t.startsWith('agent:'))
  const builtinIds = agent.toolIds.filter((t) => !t.startsWith('agent:') && !t.startsWith('mcp:'))
  const mcpIds = agent.toolIds.filter((t) => t.startsWith('mcp:'))

  async function handleRun() {
    if (!runInput.trim()) return
    setRunOutput('')
    setChildExecutions([])
    setRunMeta(null)
    setRunningId(true)
    try {
      const result = await onRun(agent.id, runInput)
      setRunOutput(result.output)
      setChildExecutions(result.children)
      setRunMeta({ tokens: result.totalTokens, steps: result.steps })
    } finally {
      setRunningId(false)
    }
  }

  return (
    <div className="border border-border rounded-xl hover:border-foreground/20 transition-colors flex flex-col">
      {/* Card header */}
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3 mb-3">
          <AgentAvatar name={agent.name} provider={agent.provider} size="md" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/agents/${agent.id}`}
              className="text-sm font-semibold truncate hover:text-primary transition-colors block"
            >
              {agent.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <ModelBadge provider={agent.provider} model={agent.model} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded hover:bg-muted transition-colors shrink-0">
              <MoreHorizontalIcon className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/agents/${agent.id}`} />}>
                <PencilIcon className="size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClone(agent)}>
                <CopyIcon className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              {!isPublished && (
                <DropdownMenuItem onClick={() => onPublish(agent)}>
                  <UploadIcon className="size-3.5" />
                  Publish to marketplace
                </DropdownMenuItem>
              )}
              {isPublished && (
                <DropdownMenuItem disabled>
                  Published
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(agent.id)}
                variant="destructive"
              >
                <TrashIcon className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {agent.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
        )}

        {/* Tool pills */}
        {(subAgentIds.length > 0 || builtinIds.length > 0 || mcpIds.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {builtinIds.slice(0, 2).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-secondary rounded-full px-2 py-0.5">
                <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                {t}
              </span>
            ))}
            {mcpIds.slice(0, 2).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-secondary rounded-full px-2 py-0.5">
                <span className="size-1.5 rounded-full bg-violet-500 shrink-0" />
                {t.slice('mcp:'.length)}
              </span>
            ))}
            {subAgentIds.slice(0, 2).map((t) => {
              const subId = t.slice('agent:'.length)
              const sub = agents.find((a) => a.id === subId)
              return (
                <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-secondary rounded-full px-2 py-0.5">
                  <BotIcon className="size-2.5" />
                  {sub?.name ?? subId.slice(0, 8)}
                </span>
              )
            })}
            {agent.toolIds.length > 6 && (
              <span className="text-[10px] text-muted-foreground">+{agent.toolIds.length - 6} more</span>
            )}
          </div>
        )}

        {/* Stats */}
        <AgentStatsRow agentId={agent.id} />
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5 flex items-center gap-2">
        <button
          onClick={() => {
            setExpanded((v) => !v)
            if (!expanded) { setRunOutput(''); setChildExecutions([]); setRunMeta(null) }
          }}
          className="inline-flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors"
        >
          <PlayIcon className="size-3" />
          Run
          {expanded ? <ChevronUpIcon className="size-3 ml-auto" /> : <ChevronDownIcon className="size-3 ml-auto" />}
        </button>
      </div>

      {/* Expanded run panel */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-secondary/30 rounded-b-xl">
          {agent.systemPrompt && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">System prompt</p>
              <p className="text-xs bg-secondary rounded-md p-2 whitespace-pre-wrap line-clamp-3">{agent.systemPrompt}</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              placeholder="Enter input…"
              className="flex-1 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              disabled={runningId}
            />
            <button
              onClick={handleRun}
              disabled={runningId || !runInput.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {runningId ? <Spinner size="sm" /> : <PlayIcon className="size-3" />}
              {runningId ? 'Running…' : 'Run'}
            </button>
          </div>

          {runOutput && (
            <div className="space-y-1">
              {runMeta && (runMeta.tokens != null || runMeta.steps != null) && (
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {runMeta.tokens != null && <span>{runMeta.tokens.toLocaleString()} tokens</span>}
                  {runMeta.steps != null && <span>{runMeta.steps} step{runMeta.steps !== 1 ? 's' : ''}</span>}
                </div>
              )}
              <pre className="text-xs bg-secondary rounded-md p-3 whitespace-pre-wrap max-h-48 overflow-auto">
                {runOutput}
              </pre>
            </div>
          )}

          {childExecutions.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                Sub-Agent Executions ({childExecutions.length})
              </p>
              <div className="rounded-md border border-border/60 p-2 space-y-0.5">
                {childExecutions.map((child) => (
                  <ChildExecutionCard key={child.id} execution={child} agents={agents} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createBasic, setCreateBasic] = useState<AgentBasicValues>(DEFAULT_BASIC)
  const [createAdvancedOpen, setCreateAdvancedOpen] = useState(false)
  const [createAdvConfig, setCreateAdvConfig] = useState<AgentConfigValues>(DEFAULT_ADV_CONFIG)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AgentData | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [usageInfo, setUsageInfo] = useState<AgentUsage | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  // Publish
  const [publishTarget, setPublishTarget] = useState<AgentData | null>(null)
  const [publishForm, setPublishForm] = useState<PublishForm>({ category: 'general', tags: '', description: '' })
  const [publishing, setPublishing] = useState(false)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set())

  // List search/filter
  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')

  // ── Data loaders ──────────────────────────────────────────────────────────

  const refreshAgents = useCallback(() => {
    setLoading(true)
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .finally(() => setLoading(false))
  }, [])

  const refreshPublished = useCallback(() => {
    fetch('/api/marketplace/mine')
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>((d.agents ?? []).map((a: { agentId: string }) => a.agentId))
        setPublishedIds(ids)
      })
      .catch(() => { /* unauthenticated — ignore */ })
  }, [])

  useEffect(() => { refreshAgents(); refreshPublished() }, [refreshAgents, refreshPublished])

  // ── Filtered list ─────────────────────────────────────────────────────────

  const visibleAgents = agents.filter((a) => {
    const q = searchQuery.toLowerCase()
    const nameMatch = !q || a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
    const provMatch = providerFilter === 'all' || a.provider === providerFilter
    return nameMatch && provMatch
  })

  const providers = [...new Set(agents.map((a) => a.provider))]

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!publishTarget) return
    setPublishing(true)
    try {
      const tags = publishForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: publishTarget.id,
          category: publishForm.category,
          tags,
          description: publishForm.description || publishTarget.description,
        }),
      })
      if (res.ok) {
        setPublishTarget(null)
        refreshPublished()
        toast.success('Agent published')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Publish failed')
      }
    } finally {
      setPublishing(false)
    }
  }

  async function createAgent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true)
    try {
      const body = {
        name: createBasic.name,
        description: createBasic.description,
        systemPrompt: createBasic.systemPrompt,
        model: createBasic.model,
        provider: createBasic.provider,
        toolIds: createBasic.toolIds,
        knowledgeBaseId: createBasic.knowledgeBaseId,
        config: {
          maxSteps: createAdvConfig.maxSteps,
          temperature: createAdvConfig.temperature,
          toolChoice: createAdvConfig.toolChoice,
          maxDelegationDepth: createAdvConfig.maxDelegationDepth,
          ...(createAdvConfig.tokenBudget != null ? { tokenBudget: createAdvConfig.tokenBudget } : {}),
          memoryEnabled: createAdvConfig.memoryEnabled,
        },
      }

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowCreate(false)
        setCreateBasic(DEFAULT_BASIC)
        setCreateAdvancedOpen(false)
        setCreateAdvConfig(DEFAULT_ADV_CONFIG)
        refreshAgents()
        toast.success('Agent created')
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create agent')
      }
    } finally {
      setCreating(false)
    }
  }

  async function initiateDelete(agent: AgentData) {
    setDeleteTarget(agent)
    setUsageInfo(null)
    setUsageLoading(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/usage`)
      if (res.ok) setUsageInfo(await res.json())
    } catch { /* ignore — show dialog without usage */ } finally {
      setUsageLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/agents/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id))
        setDeleteTarget(null)
        toast.success('Agent deleted')
      } else {
        toast.error('Failed to delete agent')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function cloneAgent(agent: AgentData) {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${agent.name} (copy)`,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          provider: agent.provider,
          toolIds: agent.toolIds,
          knowledgeBaseId: agent.knowledgeBaseId ?? null,
          config: agent.config,
        }),
      })
      if (res.ok) {
        refreshAgents()
        toast.success(`Duplicated "${agent.name}"`)
      } else {
        toast.error('Failed to duplicate agent')
      }
    } catch {
      toast.error('Failed to duplicate agent')
    }
  }

  async function runAgent(agentId: string, input: string): Promise<{ output: string; children: AgentExecution[]; totalTokens?: number; steps?: number }> {
    let accText = ''
    let totalTokens: number | undefined
    let steps: number | undefined
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: input }] }),
      })

      if (!res.ok || !res.body) return { output: 'Error running agent', children: [] }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const events = chunk.split('\n\n').filter(Boolean)
        for (const event of events) {
          const lines = event.split('\n')
          const eventLine = lines.find((l) => l.startsWith('event:'))
          const dataLine = lines.find((l) => l.startsWith('data:'))
          if (!dataLine) continue
          try {
            const payload = JSON.parse(dataLine.replace(/^data:/, ''))
            if (eventLine === 'event:text-delta') {
              accText += payload.text ?? ''
            } else if (eventLine === 'event:finish') {
              accText = payload.text ?? accText
              if (payload.totalTokens != null) totalTokens = payload.totalTokens
              if (payload.steps != null) steps = payload.steps
            }
          } catch { /* partial chunk */ }
        }
      }

      // Fetch children
      const execRes = await fetch(`/api/agents/${agentId}/executions?limit=1`)
      let children: AgentExecution[] = []
      if (execRes.ok) {
        const { executions } = await execRes.json() as { executions: AgentExecution[] }
        const latest = executions[0]
        if (latest) {
          if (totalTokens == null) totalTokens = latest.totalTokens
          const childRes = await fetch(`/api/agents/${agentId}/executions/${latest.id}/children`)
          if (childRes.ok) {
            const data = await childRes.json() as { executions: AgentExecution[] }
            children = data.executions ?? []
          }
        }
      }

      return { output: accText, children, totalTokens, steps }
    } catch {
      return { output: 'Error running agent', children: [] }
    }
  }

  // ── Delete usage description ───────────────────────────────────────────────

  function deleteDescription() {
    if (usageLoading) return 'Checking usage…'
    if (!usageInfo) return 'This action cannot be undone.'
    const { workflows, schedules } = usageInfo
    if (workflows.length === 0 && schedules.length === 0) {
      return 'This action cannot be undone. All executions and configuration will be permanently removed.'
    }
    return (
      <div className="space-y-2">
        <p className="text-amber-600 dark:text-amber-400 font-medium">
          Warning: this agent is in use.
        </p>
        {workflows.length > 0 && (
          <div className="text-xs">
            <p className="font-medium mb-0.5">Used by {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {workflows.map((w) => <li key={w.id}>{w.name}</li>)}
            </ul>
          </div>
        )}
        {schedules.length > 0 && (
          <div className="text-xs">
            <p className="font-medium mb-0.5">Used by {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {schedules.map((s) => <li key={s.id}>{s.cronExpression}</li>)}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Deleting may break them. This action cannot be undone.</p>
      </div>
    )
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  const newAgentButton = (
    <button
      onClick={() => { setShowCreate(true); setCreateBasic(DEFAULT_BASIC) }}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium shadow-sm hover:bg-foreground/90 transition-colors"
    >
      <PlusIcon className="size-4" />
      New Agent
    </button>
  )

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="BUILD"
        title="Agents"
        description="Create and manage AI agents. Each agent has its own model, tools, and knowledge base."
        variant="default"
        actions={newAgentButton}
        stats={agents.length > 0 ? [
          { label: 'Total', value: agents.length },
          { label: 'Active providers', value: new Set(agents.map((a) => a.provider)).size },
        ] : undefined}
      />

      <PageBody className="space-y-6">
        <SectionDivider label="Your agents" align="left" />

        {/* Search + filter */}
        {agents.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 max-w-sm px-3 py-1.5 rounded-md border border-input bg-background">
              <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            {providers.length > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setProviderFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${providerFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-input hover:bg-muted'}`}
                >
                  All
                </button>
                {providers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProviderFilter(p)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors capitalize ${providerFilter === p ? 'bg-foreground text-background border-foreground' : 'border-input hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agent grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={BotIcon}
            title="No agents yet"
            description="Create your first agent to get started."
            action={
              <button
                onClick={() => { setShowCreate(true); setCreateBasic(DEFAULT_BASIC) }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon className="size-3.5" />
                New Agent
              </button>
            }
          />
        ) : visibleAgents.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No agents match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                agents={agents}
                isPublished={publishedIds.has(agent.id)}
                onDelete={(id) => {
                  const a = agents.find((x) => x.id === id)
                  if (a) initiateDelete(a)
                }}
                onPublish={(a) => {
                  setPublishForm({ category: 'general', tags: '', description: a.description })
                  setPublishTarget(a)
                }}
                onClone={cloneAgent}
                onRun={runAgent}
              />
            ))}
          </div>
        )}

        {/* Create agent dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(o) => {
            if (!o) {
              setShowCreate(false)
              setCreateBasic(DEFAULT_BASIC)
              setCreateAdvancedOpen(false)
              setCreateAdvConfig(DEFAULT_ADV_CONFIG)
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <form id="create-agent-form" onSubmit={createAgent} className="space-y-3 mt-2">
              <AgentBasicFields values={createBasic} onChange={setCreateBasic} />

              {/* Advanced settings collapsible */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCreateAdvancedOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <span>Advanced settings</span>
                  {createAdvancedOpen
                    ? <ChevronUpIcon className="size-3.5 text-muted-foreground" />
                    : <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                  }
                </button>
                {createAdvancedOpen && (
                  <div className="px-3 py-3 bg-background">
                    <AgentConfigFields value={createAdvConfig} onChange={setCreateAdvConfig} />
                  </div>
                )}
              </div>
            </form>
            <DialogFooter>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateBasic(DEFAULT_BASIC) }}
                className="px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-agent-form"
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {creating && <Spinner size="sm" />}
                {creating ? 'Creating…' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish dialog */}
        <Dialog open={!!publishTarget} onOpenChange={(o) => { if (!o) setPublishTarget(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish &quot;{publishTarget?.name}&quot; to Marketplace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePublish} className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={publishForm.description}
                  onChange={(e) => setPublishForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Select
                  value={publishForm.category}
                  onValueChange={(v) => setPublishForm((f) => ({ ...f, category: v ?? 'general' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <input
                  value={publishForm.tags}
                  onChange={(e) => setPublishForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. summarizer, gpt-4, research"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setPublishTarget(null)}
                  className="px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {publishing && <Spinner size="sm" />}
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageBody>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title={`Delete "${deleteTarget?.name}"?`}
        description={deleteDescription()}
        confirmLabel="Delete agent"
        variant="destructive"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  )
}
