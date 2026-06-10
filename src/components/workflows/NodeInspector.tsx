'use client'

import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'

interface AgentOption {
  id: string
  name: string
}

interface NodeInspectorProps {
  selectedNode: Node | null
  onUpdateNode: (nodeId: string, config: Record<string, unknown>) => void
}

export function NodeInspector({ selectedNode, onUpdateNode }: NodeInspectorProps) {
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentsLoaded, setAgentsLoaded] = useState(false)

  // Fetch agents once for the agent dropdown
  useEffect(() => {
    if (agentsLoaded) return
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => {
        const list: AgentOption[] = (d.agents ?? []).map((a: { id: string; name: string }) => ({
          id: a.id,
          name: a.name,
        }))
        setAgents(list)
        setAgentsLoaded(true)
      })
      .catch(() => setAgentsLoaded(true))
  }, [agentsLoaded])

  if (!selectedNode) {
    return (
      <div className="w-60 shrink-0 border-l border-border bg-background flex items-center justify-center">
        <p className="text-xs text-muted-foreground text-center px-4">
          Select a node to configure it
        </p>
      </div>
    )
  }

  const config = (selectedNode.data as { config?: Record<string, unknown> })?.config ?? {}
  const nodeType = selectedNode.type as 'input' | 'output' | 'agent' | 'condition'

  function handleChange(key: string, value: unknown) {
    onUpdateNode(selectedNode!.id, { ...config, [key]: value })
  }

  return (
    <div className="w-60 shrink-0 border-l border-border bg-background flex flex-col overflow-y-auto">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {nodeType} node
        </p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{selectedNode.id}</p>
      </div>

      <div className="p-3 space-y-4 flex-1">
        {nodeType === 'input' && (
          <InputConfig config={config} onChange={handleChange} />
        )}
        {nodeType === 'output' && (
          <OutputConfig config={config} onChange={handleChange} />
        )}
        {nodeType === 'agent' && (
          <AgentConfig config={config} agents={agents} onChange={handleChange} />
        )}
        {nodeType === 'condition' && (
          <ConditionConfig config={config} onChange={handleChange} />
        )}
      </div>
    </div>
  )
}

function InputConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const schemaStr = config.schema ? JSON.stringify(config.schema, null, 2) : ''
  const [local, setLocal] = useState(schemaStr)
  const [err, setErr] = useState<string | null>(null)

  function handleBlur() {
    if (!local.trim()) {
      onChange('schema', undefined)
      setErr(null)
      return
    }
    try {
      const parsed = JSON.parse(local)
      onChange('schema', parsed)
      setErr(null)
    } catch {
      setErr('Invalid JSON schema')
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">Input Schema (optional)</label>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        placeholder='{ "type": "object" }'
        rows={5}
        className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {err && <p className="text-[10px] text-destructive">{err}</p>}
      <p className="text-[10px] text-muted-foreground">JSON Schema for input validation</p>
    </div>
  )
}

function OutputConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">Output Template (optional)</label>
      <textarea
        defaultValue={(config.template as string) ?? ''}
        onBlur={(e) => onChange('template', e.target.value || undefined)}
        placeholder="Use {{nodeId}} placeholders, e.g. {{agent-1}}"
        rows={5}
        className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <p className="text-[10px] text-muted-foreground">
        Leave empty to pass the upstream value through
      </p>
    </div>
  )
}

function AgentConfig({
  config,
  agents,
  onChange,
}: {
  config: Record<string, unknown>
  agents: AgentOption[]
  onChange: (key: string, value: unknown) => void
}) {
  const selectedId = (config.agentId as string) ?? ''

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">
          Agent
          {!selectedId && <span className="ml-1.5 inline-block size-2 rounded-full bg-red-500 align-middle" />}
        </label>
        <select
          value={selectedId}
          onChange={(e) => onChange('agentId', e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Select an agent…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {!selectedId && (
          <p className="text-[10px] text-red-500">An agent must be selected</p>
        )}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Input Template (optional)</label>
        <textarea
          defaultValue={(config.inputTemplate as string) ?? ''}
          onBlur={(e) => onChange('inputTemplate', e.target.value || undefined)}
          placeholder="Use {{nodeId}} to reference upstream outputs"
          rows={3}
          className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <AgentOverrides config={config} onChange={onChange} />
    </div>
  )
}

/**
 * Per-node config overrides — merged over the agent's stored config at run
 * time, so one agent can run with different tuning in different nodes.
 */
function AgentOverrides({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const overrides = (config.overrides as { temperature?: number; maxSteps?: number; tokenBudget?: number }) ?? {}

  function setOverride(key: 'temperature' | 'maxSteps' | 'tokenBudget', raw: string) {
    const num = raw.trim() === '' ? undefined : Number(raw)
    const next = { ...overrides, [key]: num !== undefined && Number.isFinite(num) ? num : undefined }
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined))
    onChange('overrides', Object.keys(cleaned).length > 0 ? cleaned : undefined)
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Overrides (this node only)
      </p>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Temperature</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="2"
          defaultValue={overrides.temperature ?? ''}
          onBlur={(e) => setOverride('temperature', e.target.value)}
          placeholder="Agent default"
          className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Max Steps</label>
        <input
          type="number"
          min="1"
          defaultValue={overrides.maxSteps ?? ''}
          onBlur={(e) => setOverride('maxSteps', e.target.value)}
          placeholder="Agent default"
          className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Token Budget</label>
        <input
          type="number"
          min="1"
          defaultValue={overrides.tokenBudget ?? ''}
          onBlur={(e) => setOverride('tokenBudget', e.target.value)}
          placeholder="No limit"
          className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-[10px] text-muted-foreground">
          Hard token ceiling for this node&apos;s run
        </p>
      </div>
    </div>
  )
}

function ConditionConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const expr = (config.expression as string) ?? ''
  const isConfigured = !!expr.trim()

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">
        JSONLogic Expression
        {!isConfigured && <span className="ml-1.5 inline-block size-2 rounded-full bg-red-500 align-middle" />}
      </label>
      <textarea
        defaultValue={expr}
        onBlur={(e) => onChange('expression', e.target.value)}
        placeholder='{">":[{"var":"value"},10]}'
        rows={4}
        className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {!isConfigured && (
        <p className="text-[10px] text-red-500">Expression is required</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        JSONLogic expression. Example:{' '}
        <code className="font-mono">{'{">": [{"var": "value"}, 10]}'}</code>
      </p>
    </div>
  )
}
