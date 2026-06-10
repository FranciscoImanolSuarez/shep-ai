'use client'

import { ArrowRightCircleIcon, ArrowLeftCircleIcon, BotIcon, GitBranchIcon } from 'lucide-react'

interface PaletteItem {
  type: 'input' | 'output' | 'agent' | 'condition'
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'input',
    label: 'Input',
    description: 'Workflow entry point',
    icon: <ArrowRightCircleIcon className="size-4 text-green-600 dark:text-green-400" />,
    color: 'border-green-200 hover:border-green-400 dark:border-green-900/50',
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Collect final result',
    icon: <ArrowLeftCircleIcon className="size-4 text-purple-600 dark:text-purple-400" />,
    color: 'border-purple-200 hover:border-purple-400 dark:border-purple-900/50',
  },
  {
    type: 'agent',
    label: 'Agent',
    description: 'Run an AI agent',
    icon: <BotIcon className="size-4 text-blue-600 dark:text-blue-400" />,
    color: 'border-blue-200 hover:border-blue-400 dark:border-blue-900/50',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch on JSONLogic',
    icon: <GitBranchIcon className="size-4 text-amber-600 dark:text-amber-400" />,
    color: 'border-amber-200 hover:border-amber-400 dark:border-amber-900/50',
  },
]

export function NodePalette() {
  function handleDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData('application/reactflow-node-type', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-48 shrink-0 flex flex-col border-r border-border bg-background h-full overflow-y-auto">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nodes</p>
      </div>
      <div className="p-2 space-y-1.5 flex-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            className={`flex items-start gap-2.5 p-2.5 rounded-md border bg-background cursor-grab active:cursor-grabbing transition-colors select-none ${item.color}`}
          >
            <div className="mt-0.5 shrink-0">{item.icon}</div>
            <div className="min-w-0">
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">Drag nodes onto the canvas</p>
      </div>
    </div>
  )
}
