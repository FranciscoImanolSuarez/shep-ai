'use client'

import { KnowledgeBaseSelector } from '@/components/knowledge-bases/KnowledgeBaseSelector'
import { ToolPicker } from '@/components/agents/ToolPicker'

type Provider = 'openai' | 'anthropic' | 'ollama'

export interface AgentBasicValues {
  name: string
  description: string
  systemPrompt: string
  provider: Provider
  model: string
  toolIds: string[]
  knowledgeBaseId: string | null
}

interface AgentBasicFieldsProps {
  values: AgentBasicValues
  onChange: (next: AgentBasicValues) => void
  /** If provided, this agent is excluded from the sub-agent list */
  currentAgentId?: string
  /** Controls whether fields are rendered as uncontrolled (for FormData) or controlled */
  mode?: 'controlled' | 'uncontrolled'
}

function set<K extends keyof AgentBasicValues>(
  prev: AgentBasicValues,
  key: K,
  val: AgentBasicValues[K],
  onChange: (next: AgentBasicValues) => void,
) {
  onChange({ ...prev, [key]: val })
}

export function AgentBasicFields({
  values,
  onChange,
  currentAgentId,
}: AgentBasicFieldsProps) {
  function update<K extends keyof AgentBasicValues>(key: K, val: AgentBasicValues[K]) {
    set(values, key, val, onChange)
  }

  return (
    <div className="space-y-3">
      {/* Name */}
      <input
        value={values.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="Name"
        required
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
      />

      {/* Description */}
      <input
        value={values.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="Description"
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
      />

      {/* System Prompt */}
      <textarea
        value={values.systemPrompt}
        onChange={(e) => update('systemPrompt', e.target.value)}
        placeholder="System prompt"
        rows={3}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
      />

      {/* Provider + Model */}
      <div className="flex gap-3">
        <select
          value={values.provider}
          onChange={(e) => update('provider', e.target.value as Provider)}
          className="px-3 py-2 rounded-md border border-input bg-background text-sm"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="ollama">Ollama</option>
        </select>
        <input
          value={values.model}
          onChange={(e) => update('model', e.target.value)}
          placeholder="Model (e.g. gpt-4o-mini)"
          className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
      </div>

      {/* Knowledge Base */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Knowledge Base (optional)</p>
        <KnowledgeBaseSelector
          value={values.knowledgeBaseId}
          onChange={(v) => update('knowledgeBaseId', v)}
          placeholder="None"
        />
      </div>

      {/* Tools (builtin + MCP + sub-agents) */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Tools & Sub-Agents</p>
        <ToolPicker
          value={values.toolIds}
          onChange={(ids) => update('toolIds', ids)}
          currentAgentId={currentAgentId}
        />
      </div>
    </div>
  )
}
