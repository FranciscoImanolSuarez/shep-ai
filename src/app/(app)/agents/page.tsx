'use client'

import { useState, useEffect, useCallback } from 'react'
import { BotIcon, PlusIcon, TrashIcon, PlayIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, UploadIcon, MoreHorizontalIcon, PencilIcon } from 'lucide-react'
import Link from 'next/link'
import { KnowledgeBaseSelector } from '@/components/knowledge-bases/KnowledgeBaseSelector'
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
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
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

interface PublishForm {
  category: string
  tags: string
  description: string
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

function AgentCard({
  agent,
  agents,
  isPublished,
  onDelete,
  onPublish,
  onRun,
}: {
  agent: AgentData
  agents: AgentData[]
  isPublished: boolean
  onDelete: (id: string) => void
  onPublish: (agent: AgentData) => void
  onRun: (agentId: string, input: string) => Promise<{ output: string; children: AgentExecution[] }>
}) {
  const [expanded, setExpanded] = useState(false)
  const [runInput, setRunInput] = useState('')
  const [runOutput, setRunOutput] = useState('')
  const [runningId, setRunningId] = useState(false)
  const [childExecutions, setChildExecutions] = useState<AgentExecution[]>([])

  const subAgentIds = agent.toolIds.filter((t) => t.startsWith('agent:'))

  async function handleRun() {
    if (!runInput.trim()) return
    setRunOutput('')
    setChildExecutions([])
    setRunningId(true)
    try {
      const result = await onRun(agent.id, runInput)
      setRunOutput(result.output)
      setChildExecutions(result.children)
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

        {/* Sub-agents pills */}
        {subAgentIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {subAgentIds.slice(0, 3).map((t) => {
              const subId = t.slice('agent:'.length)
              const sub = agents.find((a) => a.id === subId)
              return (
                <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-secondary rounded-full px-2 py-0.5">
                  <BotIcon className="size-2.5" />
                  {sub?.name ?? subId.slice(0, 8)}
                </span>
              )
            })}
            {subAgentIds.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{subAgentIds.length - 3} more</span>
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
            if (!expanded) { setRunOutput(''); setChildExecutions([]) }
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
              placeholder="Enter input..."
              className="flex-1 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            />
            <button
              onClick={handleRun}
              disabled={runningId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <PlayIcon className="size-3" />
              {runningId ? '…' : 'Run'}
            </button>
          </div>

          {runOutput && (
            <pre className="text-xs bg-secondary rounded-md p-3 whitespace-pre-wrap max-h-48 overflow-auto">
              {runOutput}
            </pre>
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

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSubAgents, setSelectedSubAgents] = useState<string[]>([])
  const [selectedKb, setSelectedKb] = useState<string | null>(null)
  const [createAdvancedOpen, setCreateAdvancedOpen] = useState(false)
  const [createAdvConfig, setCreateAdvConfig] = useState<AgentConfigValues>({
    maxSteps: 10,
    temperature: 0.7,
    toolChoice: 'auto',
    maxDelegationDepth: 3,
    tokenBudget: null,
    memoryEnabled: false,
  })
  const [publishTarget, setPublishTarget] = useState<AgentData | null>(null)
  const [publishForm, setPublishForm] = useState<PublishForm>({ category: 'general', tags: '', description: '' })
  const [publishing, setPublishing] = useState(false)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set())

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
    const form = new FormData(e.currentTarget)
    const body = {
      name: form.get('name') as string,
      description: form.get('description') as string,
      systemPrompt: form.get('systemPrompt') as string,
      model: form.get('model') as string,
      provider: form.get('provider') as string,
      toolIds: selectedSubAgents.map((id) => `agent:${id}`),
      knowledgeBaseId: selectedKb,
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
      setSelectedSubAgents([])
      setSelectedKb(null)
      setCreateAdvancedOpen(false)
      setCreateAdvConfig({ maxSteps: 10, temperature: 0.7, toolChoice: 'auto', maxDelegationDepth: 3, tokenBudget: null, memoryEnabled: false })
      refreshAgents()
      toast.success('Agent created')
    } else {
      toast.error('Failed to create agent')
    }
  }

  async function deleteAgent(id: string) {
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    setAgents((prev) => prev.filter((a) => a.id !== id))
    toast.success('Agent deleted')
  }

  async function runAgent(agentId: string, input: string): Promise<{ output: string; children: AgentExecution[] }> {
    let accText = ''
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
          const childRes = await fetch(`/api/agents/${agentId}/executions/${latest.id}/children`)
          if (childRes.ok) {
            const data = await childRes.json() as { executions: AgentExecution[] }
            children = data.executions ?? []
          }
        }
      }

      return { output: accText, children }
    } catch {
      return { output: 'Error running agent', children: [] }
    }
  }

  function toggleSubAgent(id: string) {
    setSelectedSubAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  const newAgentButton = (
    <button
      onClick={() => { setShowCreate(true); setSelectedSubAgents([]) }}
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
                onClick={() => { setShowCreate(true); setSelectedSubAgents([]) }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon className="size-3.5" />
                New Agent
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                agents={agents}
                isPublished={publishedIds.has(agent.id)}
                onDelete={deleteAgent}
                onPublish={(a) => {
                  setPublishForm({ category: 'general', tags: '', description: a.description })
                  setPublishTarget(a)
                }}
                onRun={runAgent}
              />
            ))}
          </div>
        )}

        {/* Create agent dialog */}
        <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setSelectedSubAgents([]); setCreateAdvancedOpen(false) } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <form id="create-agent-form" onSubmit={createAgent} className="space-y-3 mt-2">
              <input name="name" placeholder="Name" required className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              <input name="description" placeholder="Description" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              <textarea name="systemPrompt" placeholder="System prompt" rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" />
              <div className="flex gap-3">
                <select name="provider" defaultValue="openai" className="px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama</option>
                </select>
                <input name="model" placeholder="Model (e.g. gpt-4o-mini)" defaultValue="gpt-4o-mini" className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Knowledge Base (optional)</p>
                <KnowledgeBaseSelector value={selectedKb} onChange={setSelectedKb} placeholder="None" />
              </div>

              {agents.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Sub-Agents</p>
                  <div className="rounded-md border border-input bg-background p-2 space-y-1 max-h-36 overflow-auto">
                    {agents.map((a) => (
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
                onClick={() => { setShowCreate(false); setSelectedSubAgents([]) }}
                className="px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-agent-form"
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create
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
                <button type="button" onClick={() => setPublishTarget(null)} className="px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-accent transition-colors">Cancel</button>
                <button type="submit" disabled={publishing} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageBody>
    </div>
  )
}
