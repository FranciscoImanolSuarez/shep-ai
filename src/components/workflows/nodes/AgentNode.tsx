'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { BotIcon } from 'lucide-react'

export type AgentNodeData = {
  config: { agentId: string; inputTemplate?: string }
  agentName?: string
}

export type AgentNodeType = Node<AgentNodeData, 'agent'>

export function AgentNode({ data }: NodeProps<AgentNodeType>) {
  const isConfigured = !!data.config?.agentId

  return (
    <div className={`min-w-[180px] rounded-lg border-2 bg-background shadow-sm ${
      isConfigured ? 'border-blue-400' : 'border-red-400'
    }`}>
      {/* Target handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3 !h-3 !border-2 !border-background ${
          isConfigured ? '!bg-blue-400' : '!bg-red-400'
        }`}
      />
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-[7px] ${
        isConfigured
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'bg-red-50 dark:bg-red-900/20'
      }`}>
        <BotIcon className={`size-3.5 shrink-0 ${
          isConfigured ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'
        }`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${
          isConfigured ? 'text-blue-700 dark:text-blue-400' : 'text-red-600'
        }`}>
          Agent
        </span>
        {!isConfigured && (
          <span className="ml-auto size-2 rounded-full bg-red-500 shrink-0" title="Agent not configured" />
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground truncate">
          {data.agentName ?? (isConfigured ? data.config.agentId : 'Select an agent…')}
        </p>
      </div>
      {/* Source handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        className={`!w-3 !h-3 !border-2 !border-background ${
          isConfigured ? '!bg-blue-400' : '!bg-red-400'
        }`}
      />
    </div>
  )
}
