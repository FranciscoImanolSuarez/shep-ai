import { describe, it, expect } from 'vitest'
import { validateCronExpression } from './scheduled-agent.usecase'

describe('validateCronExpression', () => {
  it('accepts standard 5-field expressions', () => {
    expect(validateCronExpression('* * * * *')).toBe(true)
    expect(validateCronExpression('0 9 * * 1-5')).toBe(true)
    expect(validateCronExpression('*/15 * * * *')).toBe(true)
    expect(validateCronExpression('0 0 1 1 *')).toBe(true)
  })

  it('accepts 6-field (seconds) expressions supported by croner', () => {
    expect(validateCronExpression('30 * * * * *')).toBe(true)
  })

  it('rejects garbage', () => {
    expect(validateCronExpression('not a cron')).toBe(false)
    expect(validateCronExpression('')).toBe(false)
    expect(validateCronExpression('99 99 99 99 99')).toBe(false)
  })
})
