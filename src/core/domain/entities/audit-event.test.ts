import { describe, it, expect } from 'vitest'
import { computeCost, MODEL_COST_PER_1K_TOKENS } from './audit-event'

describe('computeCost', () => {
  it('returns exact cost for a known model (gpt-4o)', () => {
    const rate = MODEL_COST_PER_1K_TOKENS['gpt-4o']
    expect(computeCost('gpt-4o', 2000)).toBe((2000 / 1000) * rate)
  })

  it('returns exact cost for gpt-3.5-turbo (unambiguous key)', () => {
    const rate = MODEL_COST_PER_1K_TOKENS['gpt-3.5-turbo']
    expect(computeCost('gpt-3.5-turbo', 1000)).toBe((1000 / 1000) * rate)
  })

  it('is case-insensitive — upper-case model still resolves', () => {
    const rate = MODEL_COST_PER_1K_TOKENS['gpt-4o']
    expect(computeCost('GPT-4O', 1000)).toBe((1000 / 1000) * rate)
  })

  it('claude-sonnet-4-20250514 uses 0.009/1K rate', () => {
    const rate = MODEL_COST_PER_1K_TOKENS['claude-sonnet-4-20250514']
    expect(rate).toBe(0.009)
    expect(computeCost('claude-sonnet-4-20250514', 5000)).toBe((5000 / 1000) * 0.009)
  })

  it('claude-opus-4 uses its own rate and is NOT matched by haiku/sonnet keys', () => {
    const opusRate = MODEL_COST_PER_1K_TOKENS['claude-opus-4']
    expect(computeCost('claude-opus-4', 1000)).toBe((1000 / 1000) * opusRate)
    // The sonnet rate is 0.009 and haiku rate is 0.000625 — opus must be different
    expect(opusRate).not.toBe(MODEL_COST_PER_1K_TOKENS['claude-sonnet-4-20250514'])
    expect(opusRate).not.toBe(MODEL_COST_PER_1K_TOKENS['claude-3-haiku-20240307'])
  })

  it('gpt-4o-mini resolves to its own rate, NOT the gpt-4o rate', () => {
    // Fixed: computeCost now prefers an exact match first, then the longest
    // matching key, so 'gpt-4o-mini' (length 10) beats 'gpt-4o' (length 6)
    // and uses the correct $0.000375/1K rate instead of $0.01/1K.
    const miniRate = MODEL_COST_PER_1K_TOKENS['gpt-4o-mini']
    expect(computeCost('gpt-4o-mini', 1000)).toBe((1000 / 1000) * miniRate)
    // Confirm the gpt-4o rate is NOT applied
    const gpt4oRate = MODEL_COST_PER_1K_TOKENS['gpt-4o']
    expect(computeCost('gpt-4o-mini', 1000)).not.toBe((1000 / 1000) * gpt4oRate)
  })

  it('returns undefined for a completely unknown model', () => {
    expect(computeCost('gpt-5', 1000)).toBeUndefined()
  })

  it('returns 0 (not undefined) for zero tokens on a known model', () => {
    expect(computeCost('gpt-4o', 0)).toBe(0)
  })
})
