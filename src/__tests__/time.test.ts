import { describe, it, expect, vi, beforeEach } from 'vitest'
import { freshnessLevel, trieLagLevel, relativeTime } from '../utils/time'

describe('trieLagLevel', () => {
  it('returns "ok" for lag <= 5', () => {
    expect(trieLagLevel(-1)).toBe('ok')
    expect(trieLagLevel(0)).toBe('ok')
    expect(trieLagLevel(1)).toBe('ok')
    expect(trieLagLevel(5)).toBe('ok')
  })

  it('returns "warning" for 5 < lag <= 20', () => {
    expect(trieLagLevel(6)).toBe('warning')
    expect(trieLagLevel(10)).toBe('warning')
    expect(trieLagLevel(20)).toBe('warning')
  })

  it('returns "critical" for lag > 20', () => {
    expect(trieLagLevel(21)).toBe('critical')
    expect(trieLagLevel(100)).toBe('critical')
  })
})

describe('freshnessLevel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'))
  })

  it('returns "none" for undefined/null/0', () => {
    expect(freshnessLevel(undefined)).toBe('none')
    expect(freshnessLevel(null)).toBe('none')
    expect(freshnessLevel(0)).toBe('none')
  })

  it('returns "fresh" for < 1 hour ago', () => {
    const now = Date.now()
    expect(freshnessLevel(now - 30 * 60_000)).toBe('fresh')
  })

  it('returns "stale" for 1 hour to 1 day ago', () => {
    const now = Date.now()
    expect(freshnessLevel(now - 2 * 3_600_000)).toBe('stale')
  })

  it('returns "critical" for > 1 day ago', () => {
    const now = Date.now()
    expect(freshnessLevel(now - 2 * 86_400_000)).toBe('critical')
  })
})

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'))
  })

  it('returns "—" for falsy values', () => {
    expect(relativeTime(0)).toBe('—')
    expect(relativeTime(undefined)).toBe('—')
    expect(relativeTime(null)).toBe('—')
  })

  it('returns "刚刚" for very recent timestamps', () => {
    const now = Date.now()
    expect(relativeTime(now - 10_000)).toBe('刚刚')
  })

  it('returns minutes format', () => {
    const now = Date.now()
    expect(relativeTime(now - 5 * 60_000)).toBe('5 分钟前')
  })

  it('handles future timestamps gracefully', () => {
    const now = Date.now()
    // Future timestamps (clock skew) should not show negative values
    const result = relativeTime(now + 5 * 60_000)
    expect(result).not.toBe('-5 分钟前')
  })
})
