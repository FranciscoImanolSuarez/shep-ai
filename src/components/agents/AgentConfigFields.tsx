'use client'

import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface AgentConfigValues {
  maxSteps: number
  temperature: number
  toolChoice: 'auto' | 'required' | 'none'
  maxDelegationDepth: number
  tokenBudget: number | null
  memoryEnabled: boolean
}

interface AgentConfigFieldsProps {
  value: AgentConfigValues
  onChange: (next: AgentConfigValues) => void
}

export function AgentConfigFields({ value, onChange }: AgentConfigFieldsProps) {
  function set<K extends keyof AgentConfigValues>(key: K, v: AgentConfigValues[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="space-y-4">
      {/* Max Steps */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Max Steps</label>
        <input
          type="number"
          min={1}
          max={100}
          value={value.maxSteps}
          onChange={(e) => set('maxSteps', Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
      </div>

      {/* Temperature */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Temperature</label>
          <span className="text-xs tabular-nums text-muted-foreground">{value.temperature.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={value.temperature}
          onChange={(e) => set('temperature', parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Precise (0)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      {/* Tool Choice */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Tool Choice</label>
        <Select
          value={value.toolChoice}
          onValueChange={(v) => {
            if (v) set('toolChoice', v as 'auto' | 'required' | 'none')
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto — model decides</SelectItem>
            <SelectItem value="required">Required — always use a tool</SelectItem>
            <SelectItem value="none">None — text only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Max Delegation Depth */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Max Delegation Depth</label>
        <input
          type="number"
          min={0}
          max={10}
          value={value.maxDelegationDepth}
          onChange={(e) => set('maxDelegationDepth', Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
      </div>

      {/* Token Budget */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Token Budget</label>
        <input
          type="number"
          min={0}
          placeholder="No limit"
          value={value.tokenBudget ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            set('tokenBudget', raw === '' ? null : Math.max(1, parseInt(raw) || 1))
          }}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
        <p className="text-[11px] text-muted-foreground">Hard token ceiling per run. Leave empty for no limit.</p>
      </div>

      {/* Memory Enabled */}
      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Memory</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Inject recent run summaries into context</p>
        </div>
        <Switch
          checked={value.memoryEnabled}
          onCheckedChange={(v) => set('memoryEnabled', v)}
        />
      </div>
    </div>
  )
}
