'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BotIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  UploadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  CopyIcon,
  SearchIcon,
  GlobeIcon,
  BookOpenIcon,
  ClockIcon,
  PlugIcon,
  WrenchIcon,
  XIcon,
  CheckCircle2Icon,
  ArrowUpRightIcon,
  ZapIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

// Friendly metadata for built-in tools so cards show product labels, not raw ids.
const BUILTIN_TOOL_META: Record<string, { label: string; Icon: LucideIcon }> = {
  'web-search': { label: 'Web search', Icon: GlobeIcon },
  'rag-search': { label: 'Knowledge base', Icon: BookOpenIcon },
  'get-current-time': { label: 'Current time', Icon: ClockIcon },
}

interface ToolPillData {
  key: string
  label: string
  Icon: LucideIcon
}

/** Resolve an agent's toolIds into glanceable, human-labelled pills. */
function resolveToolPills(toolIds: string[], agents: AgentData[]): ToolPillData[] {
  return toolIds.map((id) => {
    if (id.startsWith('agent:')) {
      const subId = id.slice('agent:'.length)
      const sub = agents.find((a) => a.id === subId)
      return { key: id, label: sub?.name ?? `Agent ${subId.slice(0, 6)}`, Icon: BotIcon }
    }
    if (id.startsWith('mcp:')) {
      return { key: id, label: 'MCP server', Icon: PlugIcon }
    }
    const meta = BUILTIN_TOOL_META[id]
    return { key: id, label: meta?.label ?? id, Icon: meta?.Icon ?? WrenchIcon }
  })
}

function ToolPill({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 hover:bg-muted rounded-md px-2 py-1 transition-colors">
      <Icon className="size-2.5 shrink-0 text-muted-foreground/70" strokeWidth={2} />
      <span className="truncate max-w-[100px]">{label}</span>
    </span>
  )
}

const PROVIDER_DOT: Record<AgentData['provider'], string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  ollama: 'bg-violet-500',
}

// Distinct palette — each entry has an avatar bg and a matching stripe/ring shade.
const AGENT_PALETTE = [
  { avatar: 'bg-blue-500',    stripe: 'bg-blue-500',    ring: 'ring-blue-200 dark:ring-blue-800' },
  { avatar: 'bg-emerald-500', stripe: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  { avatar: 'bg-violet-500',  stripe: 'bg-violet-500',  ring: 'ring-violet-200 dark:ring-violet-800' },
  { avatar: 'bg-amber-500',   stripe: 'bg-amber-500',   ring: 'ring-amber-200 dark:ring-amber-800' },
  { avatar: 'bg-rose-500',    stripe: 'bg-rose-500',    ring: 'ring-rose-200 dark:ring-rose-800' },
  { avatar: 'bg-cyan-600',    stripe: 'bg-cyan-600',    ring: 'ring-cyan-200 dark:ring-cyan-800' },
  { avatar: 'bg-indigo-500',  stripe: 'bg-indigo-500',  ring: 'ring-indigo-200 dark:ring-indigo-800' },
  { avatar: 'bg-orange-500',  stripe: 'bg-orange-500',  ring: 'ring-orange-200 dark:ring-orange-800' },
  { avatar: 'bg-teal-500',    stripe: 'bg-teal-500',    ring: 'ring-teal-200 dark:ring-teal-800' },
  { avatar: 'bg-fuchsia-500', stripe: 'bg-fuchsia-500', ring: 'ring-fuchsia-200 dark:ring-fuchsia-800' },
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function agentPalette(seed: string) {
  return AGENT_PALETTE[hashString(seed) % AGENT_PALETTE.length]
}

function agentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function InitialsAvatar({ name, seed }: { name: string; seed: string }) {
  const { avatar } = agentPalette(seed)
  return (
    <div className={`size-9 rounded-xl shrink-0 flex items-center justify-center text-white text-[12px] font-bold tracking-wide ${avatar}`}>
      {agentInitials(name)}
    </div>
  )
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

  const rateColor =
    stats.successRate >= 90 ? 'bg-emerald-500'
      : stats.successRate >= 60 ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
      <span className="tabular-nums font-medium">{stats.totalRuns}</span>
      <span className="text-muted-foreground/30">runs</span>
      {stats.totalRuns > 0 && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className={`size-1.5 rounded-full shrink-0 ${rateColor}`} />
          <span className="tabular-nums">{stats.successRate}%</span>
          <span className="text-muted-foreground/30">·</span>
          <span>{relativeTime(stats.lastRunAt)}</span>
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

  const palette = agentPalette(agent.id)

  return (
    <div className="group relative bg-card rounded-2xl border border-border/60 hover:border-border hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">

      {/* Coloured top stripe — unique identity per agent */}
      <div className={`h-[3px] w-full ${palette.stripe} shrink-0`} />

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col gap-4">

        {/* Header row */}
        <div className="flex items-start gap-3">
          <InitialsAvatar name={agent.name} seed={agent.id} />
          <div className="flex-1 min-w-0">
            <Link
              href={`/agents/${agent.id}`}
              className="text-[15px] font-semibold leading-snug truncate hover:text-primary transition-colors block"
            >
              {agent.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className={`size-1.5 rounded-full shrink-0 ${PROVIDER_DOT[agent.provider]}`} />
              <span className="text-[11px] font-mono text-muted-foreground truncate capitalize">{agent.provider} · {agent.model}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all shrink-0">
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
              {!isPublished ? (
                <DropdownMenuItem onClick={() => onPublish(agent)}>
                  <UploadIcon className="size-3.5" />
                  Publish to marketplace
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <CheckCircle2Icon className="size-3.5" />
                  Published
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(agent.id)} variant="destructive">
                <TrashIcon className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className={`text-[13px] leading-relaxed line-clamp-2 -mt-1 ${agent.description ? 'text-muted-foreground' : 'text-muted-foreground/40 italic'}`}>
          {agent.description || 'No description yet'}
        </p>

        {/* Tool pills */}
        {agent.toolIds.length > 0 && (() => {
          const pills = resolveToolPills(agent.toolIds, agents)
          const shown = pills.slice(0, 3)
          const extra = pills.length - shown.length
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {shown.map((p) => <ToolPill key={p.key} label={p.label} Icon={p.Icon} />)}
              {extra > 0 && (
                <span className="text-[10px] text-muted-foreground/70 font-medium">+{extra}</span>
              )}
            </div>
          )
        })()}
      </div>

      {/* Footer: stats (left) + actions (right) */}
      <div className="border-t border-border/60 px-5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <AgentStatsRow agentId={agent.id} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={`/agents/${agent.id}`}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit agent"
          >
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
          <button
            onClick={() => {
              setExpanded((v) => !v)
              if (!expanded) { setRunOutput(''); setChildExecutions([]); setRunMeta(null) }
            }}
            className={`p-1.5 rounded-lg transition-colors ${expanded ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            title={expanded ? 'Close run panel' : 'Quick run'}
          >
            {expanded ? <XIcon className="size-3.5" /> : <ZapIcon className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable run panel */}
      {expanded && (
        <div className="border-t border-border/60 bg-muted/30 px-5 py-4 space-y-3 rounded-b-2xl">
          {agent.systemPrompt && (
            <div className="text-[11px] text-muted-foreground bg-background border border-border/60 rounded-lg px-3 py-2 line-clamp-2 leading-relaxed">
              {agent.systemPrompt}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              placeholder="Message… (⌘↵ to run)"
              rows={2}
              className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleRun() }
              }}
              disabled={runningId}
            />
            <button
              onClick={handleRun}
              disabled={runningId || !runInput.trim()}
              className="self-end px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center gap-1.5"
            >
              {runningId ? <Spinner size="sm" /> : <ZapIcon className="size-3.5" />}
            </button>
          </div>

          {runOutput && (
            <div className="space-y-1.5">
              {runMeta && (runMeta.tokens != null || runMeta.steps != null) && (
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {runMeta.tokens != null && <span className="tabular-nums">{runMeta.tokens.toLocaleString()} tokens</span>}
                  {runMeta.steps != null && <span>{runMeta.steps} step{runMeta.steps !== 1 ? 's' : ''}</span>}
                </div>
              )}
              <pre className="text-xs bg-background border border-border/60 rounded-xl px-3 py-2.5 whitespace-pre-wrap max-h-48 overflow-auto leading-relaxed">
                {runOutput}
              </pre>
            </div>
          )}

          {childExecutions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">
                Sub-agents ({childExecutions.length})
              </p>
              <div className="rounded-xl border border-border/60 bg-background p-2 space-y-0.5">
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
            <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
              {visibleAgents.length === agents.length
                ? `${agents.length} agent${agents.length !== 1 ? 's' : ''}`
                : `${visibleAgents.length} of ${agents.length}`}
            </span>
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
