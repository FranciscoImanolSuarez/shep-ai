'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BotIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CpuIcon,
  ExternalLinkIcon,
  SaveIcon,
  TrashIcon,
  ZapIcon,
} from 'lucide-react'
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { MetricCard } from '@/components/shared/MetricCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/shared/Badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/components/shared/Toast'
import { AgentAvatar } from '@/components/ai/AgentAvatar'
import { ModelBadge } from '@/components/ai/ModelBadge'
import { KnowledgeBaseSelector } from '@/components/knowledge-bases/KnowledgeBaseSelector'
import {
  AgentConfigFields,
  type AgentConfigValues,
} from '@/components/agents/AgentConfigFields'

// ── Types ────────────────────────────────────────────────────────────────────

type ToolChoice = 'auto' | 'required' | 'none'
type Provider = 'openai' | 'anthropic' | 'ollama'

interface AgentConfig {
  maxSteps: number
  temperature: number
  toolChoice: ToolChoice
  maxDelegationDepth: number
  tokenBudget?: number
  memoryEnabled?: boolean
}

interface AgentData {
  id: string
  name: string
  description: string
  systemPrompt: string
  model: string
  provider: Provider
  toolIds: string[]
  knowledgeBaseId?: string | null
  config: AgentConfig
  createdAt: string
}

interface AgentExecution {
  id: string
  agentId: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  totalTokens?: number
  steps?: unknown[]
  traceId?: string
  createdAt: string
  completedAt?: string
}

interface EvalsData {
  sampleSize: number
  successRate: number
  failureCount: number
  avgTokens: number
  totalTokens: number
  latencyMs: { p50: number; p95: number; p99: number }
  recentFailures: { executionId: string; steps: number; createdAt: string }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function formatMs(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function durationMs(exec: AgentExecution): number | null {
  if (!exec.completedAt) return null
  return new Date(exec.completedAt).getTime() - new Date(exec.createdAt).getTime()
}

function configToValues(config: AgentConfig): AgentConfigValues {
  return {
    maxSteps: config.maxSteps,
    temperature: config.temperature,
    toolChoice: config.toolChoice,
    maxDelegationDepth: config.maxDelegationDepth,
    tokenBudget: config.tokenBudget ?? null,
    memoryEnabled: config.memoryEnabled ?? false,
  }
}

function ExecStatusBadge({ status }: { status: AgentExecution['status'] }) {
  const map: Record<AgentExecution['status'], 'warning' | 'success' | 'danger'> = {
    running: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return <Badge variant={map[status]}>{status}</Badge>
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState<Provider>('openai')
  const [selectedSubAgents, setSelectedSubAgents] = useState<string[]>([])
  const [selectedKb, setSelectedKb] = useState<string | null>(null)
  const [advConfig, setAdvConfig] = useState<AgentConfigValues>({
    maxSteps: 10,
    temperature: 0.7,
    toolChoice: 'auto',
    maxDelegationDepth: 3,
    tokenBudget: null,
    memoryEnabled: false,
  })
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Other agents (for sub-agent checkboxes)
  const [allAgents, setAllAgents] = useState<AgentData[]>([])

  // Evals
  const [evals, setEvals] = useState<EvalsData | null>(null)
  const [evalsLoading, setEvalsLoading] = useState(true)

  // Executions
  const [executions, setExecutions] = useState<AgentExecution[]>([])
  const [execLoading, setExecLoading] = useState(true)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Load agent ──────────────────────────────────────────────────────────────
  const loadAgent = useCallback(() => {
    setLoading(true)
    fetch(`/api/agents/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return }
        const data = await r.json() as { agent: AgentData }
        const a = data.agent
        setAgent(a)
        setName(a.name)
        setDescription(a.description)
        setSystemPrompt(a.systemPrompt)
        setModel(a.model)
        setProvider(a.provider)
        const subIds = a.toolIds
          .filter((t) => t.startsWith('agent:'))
          .map((t) => t.slice('agent:'.length))
        setSelectedSubAgents(subIds)
        setSelectedKb(a.knowledgeBaseId ?? null)
        setAdvConfig(configToValues(a.config))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // ── Side effects ────────────────────────────────────────────────────────────
  useEffect(() => { loadAgent() }, [loadAgent])

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => setAllAgents((d.agents ?? []).filter((a: AgentData) => a.id !== id)))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    setEvalsLoading(true)
    fetch(`/api/agents/${id}/evals`)
      .then(async (r) => r.ok ? (await r.json() as EvalsData) : null)
      .then((d) => setEvals(d))
      .catch(() => {})
      .finally(() => setEvalsLoading(false))
  }, [id])

  useEffect(() => {
    setExecLoading(true)
    fetch(`/api/agents/${id}/executions?limit=20`)
      .then(async (r) => r.ok ? (await r.json() as { executions: AgentExecution[] }) : null)
      .then((d) => setExecutions(d?.executions ?? []))
      .catch(() => {})
      .finally(() => setExecLoading(false))
  }, [id])

  // ── Handlers ────────────────────────────────────────────────────────────────
  function toggleSubAgent(sid: string) {
    setSelectedSubAgents((prev) =>
      prev.includes(sid) ? prev.filter((a) => a !== sid) : [...prev, sid],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          model,
          provider,
          toolIds: selectedSubAgents.map((sid) => `agent:${sid}`),
          knowledgeBaseId: selectedKb,
          config: {
            maxSteps: advConfig.maxSteps,
            temperature: advConfig.temperature,
            toolChoice: advConfig.toolChoice,
            maxDelegationDepth: advConfig.maxDelegationDepth,
            ...(advConfig.tokenBudget != null ? { tokenBudget: advConfig.tokenBudget } : {}),
            memoryEnabled: advConfig.memoryEnabled,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json() as { agent: AgentData }
        setAgent(data.agent)
        toast.success('Agent saved')
      } else {
        const err = await res.json() as { error?: string }
        toast.error(err.error ?? 'Failed to save agent')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/agents/${id}`, { method: 'DELETE' })
      toast.success('Agent deleted')
      router.push('/agents')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="h-64 bg-muted animate-pulse" />
        <div className="px-6 py-6 max-w-7xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <div className="flex-1 overflow-auto px-6 py-6">
        <EmptyState icon={BotIcon} title="Agent not found" description="This agent doesn't exist or was deleted.">
        </EmptyState>
        <div className="mt-4 flex justify-center">
          <Link href="/agents" className="text-sm text-primary underline underline-offset-2">
            Back to agents
          </Link>
        </div>
      </div>
    )
  }

  const toolCount = agent.toolIds.filter((t) => !t.startsWith('agent:')).length
  const subAgentCount = agent.toolIds.filter((t) => t.startsWith('agent:')).length

  return (
    <div className="flex-1 overflow-auto">
      {/* Hero */}
      <Hero
        eyebrow="AGENTS"
        title={agent.name}
        description={agent.description || undefined}
        variant="default"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-muted-foreground"
            >
              <ArrowLeftIcon className="size-3.5" />
              Back
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40"
            >
              <SaveIcon className="size-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-destructive hover:bg-destructive/10 text-sm transition-colors"
            >
              <TrashIcon className="size-3.5" />
              Delete
            </button>
          </div>
        }
        stats={[
          { label: 'Provider', value: agent.provider },
          { label: 'Model', value: agent.model },
          { label: 'Tools', value: toolCount + subAgentCount, hint: subAgentCount > 0 ? `${subAgentCount} sub-agent${subAgentCount !== 1 ? 's' : ''}` : undefined },
        ]}
      />

      <PageBody className="space-y-8">

        {/* ── Configuration ──────────────────────────────────────────────────── */}
        <div>
          <SectionDivider label="Configuration" align="left" />
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 mt-4">

            {/* Header row */}
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <AgentAvatar name={agent.name} provider={agent.provider} size="lg" />
              <div>
                <p className="font-semibold">{agent.name}</p>
                <ModelBadge provider={agent.provider} model={agent.model} />
              </div>
            </div>

            {/* Basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this agent do?"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">System Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                placeholder="You are a helpful assistant…"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as Provider)}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div className="flex-1 min-w-40 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Model</label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gpt-4o-mini"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>

            {/* Knowledge Base */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Knowledge Base</label>
              <KnowledgeBaseSelector value={selectedKb} onChange={setSelectedKb} placeholder="None" />
            </div>

            {/* Sub-Agents */}
            {allAgents.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Sub-Agents</p>
                <div className="rounded-md border border-input bg-background p-2 space-y-1 max-h-40 overflow-auto">
                  {allAgents.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-sm py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedSubAgents.includes(a.id)}
                        onChange={() => toggleSubAgent(a.id)}
                        className="rounded"
                      />
                      <span className="truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">{a.provider}/{a.model}</span>
                    </label>
                  ))}
                </div>
                {selectedSubAgents.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {selectedSubAgents.length} sub-agent{selectedSubAgents.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Advanced collapsible */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <span>Advanced Settings</span>
                {advancedOpen
                  ? <ChevronUpIcon className="size-4 text-muted-foreground" />
                  : <ChevronDownIcon className="size-4 text-muted-foreground" />
                }
              </button>
              {advancedOpen && (
                <div className="px-4 py-4 bg-background">
                  <AgentConfigFields value={advConfig} onChange={setAdvConfig} />
                </div>
              )}
            </div>

            {/* Save button (inline) */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <SaveIcon className="size-3.5" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Performance ────────────────────────────────────────────────────── */}
        <div>
          <SectionDivider label="Performance" align="left" />
          {evalsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : !evals || evals.sampleSize === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={ZapIcon}
                title="No runs yet"
                description="Run this agent to start seeing performance metrics."
              />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Runs"
                  value={evals.sampleSize}
                  icon={ZapIcon}
                />
                <MetricCard
                  label="Success Rate"
                  value={`${evals.successRate}%`}
                  icon={ZapIcon}
                  trend={evals.successRate >= 80
                    ? { value: evals.successRate, positive: true }
                    : { value: 100 - evals.successRate, positive: false }
                  }
                />
                <MetricCard
                  label="P50 Latency"
                  value={formatMs(evals.latencyMs.p50)}
                  icon={ClockIcon}
                  comparison={`p95: ${formatMs(evals.latencyMs.p95)}`}
                />
                <MetricCard
                  label="Avg Tokens"
                  value={evals.avgTokens.toLocaleString()}
                  icon={CpuIcon}
                  comparison={`total: ${evals.totalTokens.toLocaleString()}`}
                />
              </div>

              {evals.recentFailures.length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wider">
                    Recent Failures ({evals.recentFailures.length})
                  </p>
                  <div className="space-y-1">
                    {evals.recentFailures.map((f) => (
                      <div key={f.executionId} className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono truncate max-w-[180px]">{f.executionId.slice(0, 8)}…</span>
                        <span>{f.steps} step{f.steps !== 1 ? 's' : ''}</span>
                        <span className="ml-auto shrink-0">{relativeTime(f.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Recent Executions ──────────────────────────────────────────────── */}
        <div>
          <SectionDivider label="Recent Executions" align="left" />
          <div className="mt-4">
            <DataTable
              headers={['Status', 'Started', 'Duration', 'Tokens', 'Steps', 'Trace']}
              loading={execLoading}
              loadingRows={5}
              empty={executions.length === 0 ? (
                <EmptyState
                  icon={ClockIcon}
                  title="No executions yet"
                  description="Run this agent to see its execution history."
                />
              ) : undefined}
            >
              {executions.map((exec) => {
                const dur = durationMs(exec)
                return (
                  <tr key={exec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <ExecStatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTime(exec.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                      {dur != null ? formatMs(dur) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                      {exec.totalTokens != null ? exec.totalTokens.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                      {Array.isArray(exec.steps) ? exec.steps.length : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {exec.traceId ? (
                        <Link
                          href={`/observability/${exec.traceId}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View trace
                          <ExternalLinkIcon className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </DataTable>
          </div>
        </div>

      </PageBody>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${agent.name}"?`}
        description="This action cannot be undone. All executions and configuration will be permanently removed."
        confirmLabel="Delete agent"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
