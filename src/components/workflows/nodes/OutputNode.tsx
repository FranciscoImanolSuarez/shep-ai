'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ArrowLeftCircleIcon } from 'lucide-react'

export type OutputNodeData = {
  config: { template?: string }
}

export type OutputNodeType = Node<OutputNodeData, 'output'>

export function OutputNode({ data }: NodeProps<OutputNodeType>) {
  const hasTemplate = !!data.config?.template

  return (
    <div className="min-w-[160px] rounded-lg border-2 border-purple-400 bg-background shadow-sm">
      {/* Target handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-background"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-t-[7px]">
        <ArrowLeftCircleIcon className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
        <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
          Output
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          {hasTemplate ? 'Template defined' : 'Pass-through'}
        </p>
      </div>
    </div>
  )
}
