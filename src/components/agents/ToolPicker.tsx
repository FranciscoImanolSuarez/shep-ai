'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { SearchIcon, BotIcon, WrenchIcon, ServerIcon } from 'lucide-react'
import { Spinner } from '@/components/shared/Spinner'
import { toast } from '@/components/shared/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuiltinTool {
  id: string
  name: string
  description: string
  category: string
}

interface McpServer {
  id: string
  name: string
}

interface AgentData {
  id: string
  name: string
  description: string
  model: string
  provider: string
}

interface ToolPickerProps {
  /** Flat mixed toolIds array: bare ids, `mcp:<id>`, `agent:<id>` */
  value: string[]
  onChange: (ids: string[]) => void
  /** Exclude this agent from the sub-agent list to prevent self-delegation */
  currentAgentId?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggle(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function matches(query: string, ...fields: string[]): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return fields.some((f) => f.toLowerCase().includes(q))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  count,
  selected,
}: {
  icon: typeof BotIcon
  label: string
  count: number
  selected: number
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-background z-10 border-b border-border/60">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
        {label}
      </span>
      <span className="text-[10px] bg-secondary rounded-full px-1.5 py-0.5 text-muted-foreground tabular-nums">
        {count}
      </span>
      {selected > 0 && (
        <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5 tabular-nums font-medium">
          {selected} selected
        </span>
      )}
    </div>
  )
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string
  checked: boolean
  onChange: () => void
  label: string
  hint?: string
}) {
  return (
    <label
      htmlFor={`tool-${id}`}
      className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors"
    >
      <input
        id={`tool-${id}`}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded size-3.5 shrink-0 accent-primary"
      />
      <span className="text-sm truncate flex-1">{label}</span>
      {hint && (
        <span className="text-[11px] text-muted-foreground truncate max-w-[160px] shrink-0 text-right">
          {hint}
        </span>
      )}
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ToolPicker({ value, onChange, currentAgentId }: ToolPickerProps) {
  const [builtins, setBuiltins] = useState<BuiltinTool[]>([])
  const [mcpServers, setMcpServers] = useState<McpServer[]>([])
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/tools').then((r) => r.ok ? r.json() : { tools: [], mcpServers: [] }),
      fetch('/api/agents').then((r) => r.ok ? r.json() : { agents: [] }),
    ]).then(([toolsData, agentsData]) => {
      if (cancelled) return
      setBuiltins(toolsData.tools ?? [])
      setMcpServers(toolsData.mcpServers ?? [])
      const all: AgentData[] = agentsData.agents ?? []
      setAgents(currentAgentId ? all.filter((a) => a.id !== currentAgentId) : all)
    }).catch(() => {
      toast.error('Failed to load tool catalog')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [currentAgentId])

  // Filtered groups
  const filteredBuiltins = useMemo(
    () => builtins.filter((t) => matches(query, t.name, t.description, t.category)),
    [builtins, query],
  )
  const filteredMcp = useMemo(
    () => mcpServers.filter((s) => matches(query, s.name)),
    [mcpServers, query],
  )
  const filteredAgents = useMemo(
    () => agents.filter((a) => matches(query, a.name, a.description ?? '')),
    [agents, query],
  )

  // Selected counts per group
  const selectedBuiltins = value.filter((id) => builtins.some((b) => b.id === id)).length
  const selectedMcp = value.filter((id) => id.startsWith('mcp:')).length
  const selectedAgents = value.filter((id) => id.startsWith('agent:')).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 rounded-md border border-input bg-background">
        <Spinner size="sm" />
        <span className="ml-2 text-xs text-muted-foreground">Loading tools…</span>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {(selectedBuiltins + selectedMcp + selectedAgents) > 0 && (
          <span className="text-[11px] text-muted-foreground shrink-0">
            {selectedBuiltins + selectedMcp + selectedAgents} selected
          </span>
        )}
      </div>

      {/* Scrollable list */}
      <div className="max-h-64 overflow-auto divide-y divide-border/50">

        {/* Built-in tools */}
        {(filteredBuiltins.length > 0 || !query) && (
          <div>
            <SectionHeader
              icon={WrenchIcon}
              label="Built-in tools"
              count={filteredBuiltins.length}
              selected={selectedBuiltins}
            />
            <div className="p-1">
              {filteredBuiltins.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">No built-in tools match your search.</p>
              ) : filteredBuiltins.map((tool) => (
                <CheckRow
                  key={tool.id}
                  id={tool.id}
                  checked={value.includes(tool.id)}
                  onChange={() => onChange(toggle(value, tool.id))}
                  label={tool.name}
                  hint={tool.description.slice(0, 50) + (tool.description.length > 50 ? '…' : '')}
                />
              ))}
            </div>
          </div>
        )}

        {/* MCP servers */}
        {(filteredMcp.length > 0 || !query) && (
          <div>
            <SectionHeader
              icon={ServerIcon}
              label="MCP servers"
              count={filteredMcp.length}
              selected={selectedMcp}
            />
            <div className="p-1">
              {filteredMcp.length === 0 && mcpServers.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  None configured.{' '}
                  <Link href="/integrations/mcp-servers" className="underline underline-offset-2 hover:text-foreground">
                    Add MCP servers
                  </Link>
                </p>
              ) : filteredMcp.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">No MCP servers match your search.</p>
              ) : filteredMcp.map((srv) => (
                <CheckRow
                  key={srv.id}
                  id={`mcp:${srv.id}`}
                  checked={value.includes(`mcp:${srv.id}`)}
                  onChange={() => onChange(toggle(value, `mcp:${srv.id}`))}
                  label={srv.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sub-agents */}
        {(filteredAgents.length > 0 || !query) && (
          <div>
            <SectionHeader
              icon={BotIcon}
              label="Sub-agents"
              count={filteredAgents.length}
              selected={selectedAgents}
            />
            <div className="p-1">
              {filteredAgents.length === 0 && agents.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">No other agents to delegate to.</p>
              ) : filteredAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">No agents match your search.</p>
              ) : filteredAgents.map((agent) => (
                <CheckRow
                  key={agent.id}
                  id={`agent:${agent.id}`}
                  checked={value.includes(`agent:${agent.id}`)}
                  onChange={() => onChange(toggle(value, `agent:${agent.id}`))}
                  label={agent.name}
                  hint={`${agent.provider}/${agent.model}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* No results at all */}
        {query && filteredBuiltins.length === 0 && filteredMcp.length === 0 && filteredAgents.length === 0 && (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            No tools match &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  )
}
