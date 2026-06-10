import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { relativeTime } from './relative-time'

const NOW = new Date('2026-06-10T12:00:00Z')

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" under a minute', () => {
    expect(relativeTime(new Date(NOW.getTime() - 30_000))).toBe('just now')
  })

  it('formats minutes, hours, days, weeks, months and years', () => {
    const min = 60_000
    expect(relativeTime(new Date(NOW.getTime() - 5 * min))).toBe('5m ago')
    expect(relativeTime(new Date(NOW.getTime() - 3 * 60 * min))).toBe('3h ago')
    expect(relativeTime(new Date(NOW.getTime() - 2 * 24 * 60 * min))).toBe('2d ago')
    expect(relativeTime(new Date(NOW.getTime() - 14 * 24 * 60 * min))).toBe('2w ago')
    expect(relativeTime(new Date(NOW.getTime() - 90 * 24 * 60 * min))).toBe('3mo ago')
    expect(relativeTime(new Date(NOW.getTime() - 800 * 24 * 60 * min))).toBe('2y ago')
  })

  it('accepts ISO strings', () => {
    expect(relativeTime('2026-06-10T11:00:00Z')).toBe('1h ago')
  })
})
