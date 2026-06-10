'use client'

// NOTE: This file imports @xyflow/react directly.
// It MUST NEVER be imported directly in a page or server component.
// Always use: next/dynamic(() => import('@/components/workflows/WorkflowCanvas').then(m => m.WorkflowCanvas), { ssr: false })
// ADR-5: xyflow pinned at exact version 12.10.2 in package.json (no caret)
// No React 19 runtime warnings observed at this version per xyflow v12.4+ release notes.

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Use browser-native crypto.randomUUID() (available in all modern browsers since 2021)
function genId(): string {
  return crypto.randomUUID().slice(0, 8)
}

import { InputNode } from './nodes/InputNode'
import { OutputNode } from './nodes/OutputNode'
import { AgentNode } from './nodes/AgentNode'
import { ConditionNode } from './nodes/ConditionNode'
import { NodePalette } from './NodePalette'
import { NodeInspector } from './NodeInspector'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'
import { toast } from '@/components/shared/Toast'

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  agent: AgentNode,
  condition: ConditionNode,
}

// Default configs per node type
function defaultConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'input': return { schema: {} }
    case 'output': return {}
    case 'agent': return { agentId: '' }
    case 'condition': return { expression: '' }
    default: return {}
  }
}

function definitionToFlow(def: WorkflowDefinition): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = def.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { config: n.config },
  }))
  const edges: Edge[] = def.edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle ?? null,
    target: e.target,
    targetHandle: e.targetHandle ?? null,
  }))
  return { nodes, edges }
}

function flowToDefinition(nodes: Node[], edges: Edge[]): WorkflowDefinition {
  const mappedNodes = nodes.map((n) => {
    const config = ((n.data as { config?: Record<string, unknown> })?.config ?? {})
    const type = n.type as 'input' | 'output' | 'agent' | 'condition'
    return { id: n.id, type, position: n.position, config }
  }) as WorkflowDefinition['nodes']
  return {
    nodes: mappedNodes,
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: (e.sourceHandle as 'true' | 'false' | null | undefined) ?? undefined,
      target: e.target,
      targetHandle: e.targetHandle ?? undefined,
    })),
  }
}

export interface WorkflowCanvasProps {
  workflowId: string
  initialDefinition: WorkflowDefinition
  onSave: (def: WorkflowDefinition) => Promise<void>
  onRun: (input: Record<string, unknown>) => Promise<{ runId: string }>
}

export function WorkflowCanvas({ workflowId, initialDefinition, onSave, onRun }: WorkflowCanvasProps) {
  const router = useRouter()
  const { nodes: initNodes, edges: initEdges } = definitionToFlow(initialDefinition)

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Run modal state
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [runInput, setRunInput] = useState('{}')
  const [runInputError, setRunInputError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/reactflow-node-type')
      if (!type || !rfInstance) return

      const position = rfInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })

      const newNode: Node = {
        id: `${type}-${genId()}`,
        type,
        position,
        data: { config: defaultConfig(type) },
      }

      setNodes((nds) => [...nds, newNode])
      setSelectedNodeId(newNode.id)
    },
    [rfInstance, setNodes],
  )

  function handleUpdateNode(nodeId: string, config: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
      ),
    )
  }

  // T2.26 — client-side validation before save
  function validateDefinition(): string | null {
    const hasInput = nodes.some((n) => n.type === 'input')
    const hasOutput = nodes.some((n) => n.type === 'output')
    if (!hasInput || !hasOutput) {
      return 'Workflow needs at least one input and one output node'
    }

    const unconfiguredAgents = nodes.filter((n) => {
      if (n.type !== 'agent') return false
      const config = (n.data as { config?: { agentId?: string } })?.config
      return !config?.agentId
    })
    if (unconfiguredAgents.length > 0) {
      return 'Configure all agent nodes — select an agent for each'
    }

    const unconfiguredConditions = nodes.filter((n) => {
      if (n.type !== 'condition') return false
      const config = (n.data as { config?: { expression?: string } })?.config
      return !config?.expression?.trim()
    })
    if (unconfiguredConditions.length > 0) {
      return 'Configure all condition nodes — add a JSONLogic expression'
    }

    return null
  }

  async function handleSave() {
    setSaveError(null)
    setSaveSuccess(false)

    const validationError = validateDefinition()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    try {
      const definition = flowToDefinition(nodes, edges)
      await onSave(definition)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      toast.success('Workflow saved')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save workflow'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // T2.27 — run modal
  async function handleRunConfirm() {
    setRunInputError(null)
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(runInput) as Record<string, unknown>
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error('Input must be a JSON object')
      }
    } catch (err) {
      setRunInputError(err instanceof Error ? err.message : 'Invalid JSON')
      return
    }

    setRunning(true)
    try {
      await onRun(parsed)
      setRunModalOpen(false)
      toast.success('Workflow run started')
      router.push(`/workflows/${workflowId}/runs`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger workflow run'
      setRunInputError(msg)
      toast.error(msg)
    } finally {
      setRunning(false)
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <div className="flex-1" />
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-md border border-red-200 dark:border-red-800">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-xs underline shrink-0">Dismiss</button>
          </div>
        )}
        {saveSuccess && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
        <button
          onClick={() => setRunModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
        >
          Run
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Main canvas area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <NodePalette />

        {/* ReactFlow canvas */}
        <div ref={reactFlowWrapper} className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setRfInstance}
            fitView
            className="bg-muted/20"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Inspector */}
        <NodeInspector selectedNode={selectedNode} onUpdateNode={handleUpdateNode} />
      </div>

      {/* Run modal */}
      {runModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-sm font-semibold">Run workflow</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Input payload (JSON)</label>
              <textarea
                value={runInput}
                onChange={(e) => { setRunInput(e.target.value); setRunInputError(null) }}
                rows={6}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {runInputError && (
                <p className="text-[11px] text-destructive">{runInputError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRunModalOpen(false); setRunInputError(null) }}
                disabled={running}
                className="px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunConfirm}
                disabled={running}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {running ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
