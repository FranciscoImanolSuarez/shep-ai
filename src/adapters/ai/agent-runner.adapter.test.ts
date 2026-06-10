import { describe, it, expect } from 'vitest'
import { tokenBudgetCondition } from './agent-runner.adapter'

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
