import { describe, it, expect, vi } from 'vitest'
import { tokenBudgetCondition, addCacheControl, convertTools } from './agent-runner.adapter'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import type { ModelMessage } from 'ai'
import { z } from 'zod'

type StepLike = { usage?: { inputTokens?: number; outputTokens?: number } }

function run(condition: ReturnType<typeof tokenBudgetCondition>, steps: StepLike[]) {
  return (condition as unknown as (args: { steps: StepLike[] }) => boolean)({ steps })
}

describe('tokenBudgetCondition', () => {
  it('does not stop while cumulative tokens are under budget', () => {
    const cond = tokenBudgetCondition(1000)
    const steps = [
      { usage: { inputTokens: 200, outputTokens: 100 } },
      { usage: { inputTokens: 300, outputTokens: 100 } },
    ]
    expect(run(cond, steps)).toBe(false)
  })

  it('stops once input+output tokens reach the budget exactly', () => {
    const cond = tokenBudgetCondition(1000)
    const steps = [
      { usage: { inputTokens: 600, outputTokens: 0 } },
      { usage: { inputTokens: 300, outputTokens: 100 } },
    ]
    expect(run(cond, steps)).toBe(true)
  })

  it('stops when a single step blows past the budget', () => {
    const cond = tokenBudgetCondition(500)
    expect(run(cond, [{ usage: { inputTokens: 9000, outputTokens: 1 } }])).toBe(true)
  })

  it('treats missing usage as zero tokens', () => {
    const cond = tokenBudgetCondition(100)
    expect(run(cond, [{}, { usage: {} }])).toBe(false)
  })

  it('returns false with no steps', () => {
    expect(run(tokenBudgetCondition(1), [])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// addCacheControl
// ---------------------------------------------------------------------------

describe('addCacheControl', () => {
  const msg = (content: string): ModelMessage => ({ role: 'user', content })

  it('returns messages unchanged for non-anthropic providers', () => {
    const msgs = [msg('a'), msg('b')]
    expect(addCacheControl(msgs, 'openai')).toEqual(msgs)
  })

  it('returns empty array unchanged for anthropic provider', () => {
    expect(addCacheControl([], 'anthropic')).toEqual([])
  })

  it('marks only the LAST message with cacheControl for anthropic', () => {
    const msgs = [msg('first'), msg('second'), msg('last')]
    const result = addCacheControl(msgs, 'anthropic')
    // first two must not have providerOptions
    expect((result[0] as Record<string, unknown>).providerOptions).toBeUndefined()
    expect((result[1] as Record<string, unknown>).providerOptions).toBeUndefined()
    // last must have ephemeral cache control
    expect((result[2] as Record<string, unknown>).providerOptions).toEqual({
      anthropic: { cacheControl: { type: 'ephemeral' } },
    })
  })

  it('single message gets cache control for anthropic', () => {
    const result = addCacheControl([msg('only')], 'anthropic')
    expect((result[0] as Record<string, unknown>).providerOptions).toEqual({
      anthropic: { cacheControl: { type: 'ephemeral' } },
    })
  })
})

// ---------------------------------------------------------------------------
// convertTools
// ---------------------------------------------------------------------------

describe('convertTools', () => {
  function makeToolDef(overrides: Partial<AgentToolDefinition>): AgentToolDefinition {
    return {
      id: 'test-tool',
      name: 'Test Tool',
      description: 'A test tool',
      category: 'builtin',
      type: 'function',
      parametersSchema: z.object({}),
      ...overrides,
    }
  }

  it('passes through a tool that has sdkTool set as-is', () => {
    const fakeSdkTool = { description: 'prebuilt', parameters: {} }
    const def = makeToolDef({ id: 'mcp-tool', sdkTool: fakeSdkTool })
    const result = convertTools([def], 'openai')
    expect(result['mcp-tool']).toBe(fakeSdkTool)
  })

  it('includes a function tool that has an execute property', () => {
    const def = makeToolDef({
      id: 'my-fn',
      execute: vi.fn().mockResolvedValue('result'),
    })
    const result = convertTools([def], 'openai')
    expect(result['my-fn']).toBeDefined()
  })

  it('skips a tool with no execute, no sdkTool, and type !== provider', () => {
    const def = makeToolDef({ id: 'no-execute', execute: undefined, sdkTool: undefined })
    const result = convertTools([def], 'openai')
    expect(result['no-execute']).toBeUndefined()
  })

  it('web-search provider tool with an unsupported provider (ollama) is NOT in the result', () => {
    const def = makeToolDef({ id: 'web-search', type: 'provider', execute: undefined })
    // ollama is not in the providerToolResolvers switch, so resolver returns null
    const result = convertTools([def], 'ollama')
    expect(result['web-search']).toBeUndefined()
  })
})

