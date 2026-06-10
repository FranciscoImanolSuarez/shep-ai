import type { WorkflowNode } from '@/core/domain/entities/workflow-node'
import type { WorkflowEdge } from '@/core/domain/entities/workflow-definition'

/**
 * Detects a cycle in the workflow graph using DFS with white/gray/black coloring.
 * white = not visited, gray = in-progress (on current DFS stack), black = fully visited.
 * A gray→gray edge means a cycle.
 */
export function detectCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  if (nodes.length === 0) return false

  const nodeIds = new Set(nodes.map((n) => n.id))
  // Build adjacency list (only include edges where both endpoints exist)
  const adj = new Map<string, string[]>()
  for (const node of nodes) {
    adj.set(node.id, [])
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target)
    }
  }

  type Color = 'white' | 'gray' | 'black'
  const color = new Map<string, Color>()
  for (const node of nodes) {
    color.set(node.id, 'white')
  }

  function dfs(id: string): boolean {
    color.set(id, 'gray')
    for (const neighbor of adj.get(id) ?? []) {
      if (color.get(neighbor) === 'gray') {
        // Back edge — cycle found
        return true
      }
      if (color.get(neighbor) === 'white') {
        if (dfs(neighbor)) return true
      }
    }
    color.set(id, 'black')
    return false
  }

  for (const node of nodes) {
    if (color.get(node.id) === 'white') {
      if (dfs(node.id)) return true
    }
  }

  return false
}

/**
 * Returns nodes in topological order using Kahn's algorithm.
 * Throws if the graph contains a cycle.
 * Edges referencing nonexistent nodes are ignored.
 */
export function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (nodes.length === 0) return []

  const nodeIds = new Set(nodes.map((n) => n.id))
  const nodeMap = new Map<string, WorkflowNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  // Build adjacency list + in-degree map (ignore edges with missing endpoints)
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  for (const node of nodes) {
    adj.set(node.id, [])
    inDegree.set(node.id, 0)
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    }
  }

  // Kahn's algorithm
  const queue: string[] = []
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id)
  }

  const result: WorkflowNode[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    result.push(nodeMap.get(id)!)

    for (const neighbor of adj.get(id) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  if (result.length !== nodes.length) {
    throw new Error('Workflow graph contains a cycle — topological sort is not possible.')
  }

  return result
}
