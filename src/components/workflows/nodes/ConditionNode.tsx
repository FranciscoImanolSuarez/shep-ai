'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { GitBranchIcon } from 'lucide-react'

export type ConditionNodeData = {
  config: { expression: string }
}

export type ConditionNodeType = Node<ConditionNodeData, 'condition'>

export function ConditionNode({ data }: NodeProps<ConditionNodeType>) {
  const isConfigured = !!data.config?.expression?.trim()

  return (
    <div className={`min-w-[180px] rounded-lg border-2 bg-background shadow-sm ${
      isConfigured ? 'border-amber-400' : 'border-red-400'
    }`}>
      {/* Target handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3 !h-3 !border-2 !border-background ${
          isConfigured ? '!bg-amber-400' : '!bg-red-400'
        }`}
      />
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-[7px] ${
        isConfigured
          ? 'bg-amber-50 dark:bg-amber-900/20'
          : 'bg-red-50 dark:bg-red-900/20'
      }`}>
        <GitBranchIcon className={`size-3.5 shrink-0 ${
          isConfigured ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'
        }`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${
          isConfigured ? 'text-amber-700 dark:text-amber-400' : 'text-red-600'
        }`}>
          Condition
        </span>
        {!isConfigured && (
          <span className="ml-auto size-2 rounded-full bg-red-500 shrink-0" title="Expression not configured" />
        )}
      </div>
      <div className="px-3 py-2 space-y-1">
        <p className="text-[11px] text-muted-foreground truncate font-mono">
          {isConfigured ? data.config.expression.slice(0, 30) + (data.config.expression.length > 30 ? '…' : '') : 'Set expression…'}
        </p>
      </div>
      {/* Two source handles — true (top-right) and false (bottom-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '35%' }}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '65%' }}
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-background"
      />
      {/* Labels for the handles */}
      <div className="absolute right-4 top-[28%] text-[9px] font-medium text-green-600 pointer-events-none select-none">T</div>
      <div className="absolute right-4 top-[58%] text-[9px] font-medium text-red-500 pointer-events-none select-none">F</div>
    </div>
  )
}
