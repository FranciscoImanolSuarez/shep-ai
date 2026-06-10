import { describe, it, expect } from 'vitest'
import { detectCycle, topologicalSort } from './workflow-dag'
import type { WorkflowNode } from '@/core/domain/entities/workflow-node'
import type { WorkflowEdge } from '@/core/domain/entities/workflow-definition'

function agentNode(id: string): WorkflowNode {
  return { id, type: 'agent', position: { x: 0, y: 0 }, config: { agentId: `a-${id}` } }
}

function edge(source: string, target: string): WorkflowEdge {
  return { id: `${source}->${target}`, source, target }
}

describe('detectCycle', () => {
  it('returns false for an empty graph', () => {
    expect(detectCycle([], [])).toBe(false)
  })

  it('returns false for a linear chain', () => {
    const nodes = [agentNode('a'), agentNode('b'), agentNode('c')]
    expect(detectCycle(nodes, [edge('a', 'b'), edge('b', 'c')])).toBe(false)
  })

  it('returns false for a diamond (DAG with reconverging branches)', () => {
    const nodes = ['a', 'b', 'c', 'd'].map(agentNode)
    const edges = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')]
    expect(detectCycle(nodes, edges)).toBe(false)
  })

  it('detects a direct 2-node cycle', () => {
    const nodes = [agentNode('a'), agentNode('b')]
    expect(detectCycle(nodes, [edge('a', 'b'), edge('b', 'a')])).toBe(true)
  })

  it('detects a self-loop', () => {
    expect(detectCycle([agentNode('a')], [edge('a', 'a')])).toBe(true)
  })

  it('detects a cycle in a disconnected component', () => {
    const nodes = ['a', 'b', 'x', 'y', 'z'].map(agentNode)
    const edges = [edge('a', 'b'), edge('x', 'y'), edge('y', 'z'), edge('z', 'x')]
    expect(detectCycle(nodes, edges)).toBe(true)
  })

  it('ignores edges referencing nonexistent nodes', () => {
    const nodes = [agentNode('a')]
    expect(detectCycle(nodes, [edge('a', 'ghost'), edge('ghost', 'a')])).toBe(false)
  })
})

describe('topologicalSort', () => {
  it('returns [] for an empty graph', () => {
    expect(topologicalSort([], [])).toEqual([])
  })

  it('orders a linear chain source-first', () => {
    const nodes = [agentNode('c'), agentNode('a'), agentNode('b')]
    const sorted = topologicalSort(nodes, [edge('a', 'b'), edge('b', 'c')])
    expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('places every node after all of its dependencies (diamond)', () => {
    const nodes = ['d', 'c', 'b', 'a'].map(agentNode)
    const edges = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')]
    const order = topologicalSort(nodes, edges).map((n) => n.id)
    for (const e of edges) {
      expect(order.indexOf(e.source)).toBeLessThan(order.indexOf(e.target))
    }
    expect(order).toHaveLength(4)
  })

  it('throws on a cyclic graph', () => {
    const nodes = [agentNode('a'), agentNode('b')]
    expect(() => topologicalSort(nodes, [edge('a', 'b'), edge('b', 'a')])).toThrow(/cycle/)
  })

  it('includes isolated nodes', () => {
    const nodes = [agentNode('a'), agentNode('island')]
    const order = topologicalSort(nodes, []).map((n) => n.id)
    expect(order).toContain('island')
    expect(order).toHaveLength(2)
  })
})
