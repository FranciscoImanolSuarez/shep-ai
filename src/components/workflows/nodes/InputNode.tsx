'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ArrowRightCircleIcon } from 'lucide-react'

export type InputNodeData = {
  config: { schema?: Record<string, unknown> }
}

export type InputNodeType = Node<InputNodeData, 'input'>

export function InputNode({ data }: NodeProps<InputNodeType>) {
  const hasSchema = !!data.config?.schema && Object.keys(data.config.schema).length > 0

  return (
    <div className="min-w-[160px] rounded-lg border-2 border-green-400 bg-background shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-t-[7px]">
        <ArrowRightCircleIcon className="size-3.5 text-green-600 dark:text-green-400 shrink-0" />
        <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
          Input
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          {hasSchema ? 'Schema defined' : 'Any input'}
        </p>
      </div>
      {/* Source handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-background"
      />
    </div>
  )
}
