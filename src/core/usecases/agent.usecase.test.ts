import { describe, it, expect } from 'vitest'
import { classifyToolIds, buildMemorySnippet } from './agent.usecase'
import type { AgentExecution } from '@/core/domain/entities/agent-execution'

// ---------------------------------------------------------------------------
// classifyToolIds
// ---------------------------------------------------------------------------

describe('classifyToolIds', () => {
  it('bare ids go to regularIds; no agent/mcp buckets', () => {
    const result = classifyToolIds(['web-search', 'rag-search'])
    expect(result.regularIds).toEqual(['web-search', 'rag-search'])
    expect(result.agentIds).toEqual([])
    expect(result.mcpServerIds).toEqual([])
  })

  it('agent: prefix ids keep the full id (prefix NOT stripped) in agentIds', () => {
    // The delegation factory calls .slice('agent:'.length) itself, so the full
    // id is intentionally kept in agentIds at this stage.
    const result = classifyToolIds(['agent:abc-123'])
    expect(result.agentIds).toEqual(['agent:abc-123'])
    expect(result.regularIds).toEqual([])
    expect(result.mcpServerIds).toEqual([])
  })

  it('mcp: prefix ids have the prefix stripped in mcpServerIds', () => {
    const result = classifyToolIds(['mcp:server-uuid'])
    expect(result.mcpServerIds).toEqual(['server-uuid'])
    expect(result.regularIds).toEqual([])
    expect(result.agentIds).toEqual([])
  })

  it('correctly splits a mixed array into all three buckets', () => {
    const ids = ['rag-search', 'agent:delegate-abc', 'mcp:srv-1', 'web-search', 'mcp:srv-2']
    const result = classifyToolIds(ids)
    expect(result.regularIds).toEqual(['rag-search', 'web-search'])
    expect(result.agentIds).toEqual(['agent:delegate-abc'])
    expect(result.mcpServerIds).toEqual(['srv-1', 'srv-2'])
  })

  it('returns three empty arrays for an empty input', () => {
    const result = classifyToolIds([])
    expect(result.regularIds).toEqual([])
    expect(result.agentIds).toEqual([])
    expect(result.mcpServerIds).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// buildMemorySnippet
// ---------------------------------------------------------------------------

function makeExecution(overrides: Partial<AgentExecution> = {}): AgentExecution {
  return {
    id: 'exec-1',
    agentId: 'agent-1',
    status: 'completed',
    input: [{ id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() }],
    steps: [],
    result: 'Hi there',
    totalTokens: 10,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

describe('buildMemorySnippet', () => {
  it('returns empty string when executions array is empty', () => {
    expect(buildMemorySnippet([])).toBe('')
  })

  it('returns empty string when all executions are non-completed', () => {
    const execs = [
      makeExecution({ status: 'running', result: undefined }),
      makeExecution({ status: 'failed', result: undefined }),
    ]
    expect(buildMemorySnippet(execs)).toBe('')
  })

  it('returns empty string when completed executions have no result', () => {
    const execs = [makeExecution({ status: 'completed', result: undefined })]
    expect(buildMemorySnippet(execs)).toBe('')
  })

  it('wraps output in <recent-sessions> tags', () => {
    const snippet = buildMemorySnippet([makeExecution()])
    expect(snippet).toContain('<recent-sessions>')
    expect(snippet).toContain('</recent-sessions>')
  })

  it('shows at most 5 completed runs even when 7 are provided', () => {
    const execs = Array.from({ length: 7 }, (_, i) =>
      makeExecution({ id: `exec-${i}`, result: `result-${i}` }),
    )
    const snippet = buildMemorySnippet(execs)
    expect(snippet).toContain('#5')
    expect(snippet).not.toContain('#6')
  })

  it('truncates a result longer than 240 chars with …', () => {
    const longResult = 'x'.repeat(300)
    const snippet = buildMemorySnippet([makeExecution({ result: longResult })])
    expect(snippet).toContain('x'.repeat(240) + '…')
    expect(snippet).not.toContain('x'.repeat(241))
  })

  it('user message content that is an object produces [object Object] — latent bug', () => {
    // TODO: latent bug — non-string content (e.g. a structured message part)
    // yields '[object Object]' in the memory snippet because the code calls
    // String(firstUserMsg) without checking the type.
    const exec = makeExecution({
      input: [{ id: 'msg-1', role: 'user', content: { text: 'hello' } as unknown as string, createdAt: new Date() }],
    })
    const snippet = buildMemorySnippet([exec])
    expect(snippet).toContain('[object Object]')
  })
})
