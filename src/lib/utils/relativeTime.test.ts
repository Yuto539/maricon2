import { describe, it, expect } from 'vitest'
import { relativeTime } from './relativeTime'

describe('relativeTime', () => {
  const makeNow = (offsetMs = 0) => new Date('2026-05-02T12:00:00.000Z')

  it('returns "たった今" when less than 1 minute ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 30_000) // 30 seconds ago
    expect(relativeTime(past.toISOString(), now)).toBe('たった今')
  })

  it('returns "たった今" when exactly 0 seconds ago', () => {
    const now = makeNow()
    expect(relativeTime(now.toISOString(), now)).toBe('たった今')
  })

  it('returns "X分前" for 1 minute ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('1分前')
  })

  it('returns "X分前" for 59 minutes ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 59 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('59分前')
  })

  it('returns "X時間前" for 1 hour ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 60 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('1時間前')
  })

  it('returns "X時間前" for 23 hours ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 23 * 60 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('23時間前')
  })

  it('returns "X日前" for 1 day ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 24 * 60 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('1日前')
  })

  it('returns "X日前" for 6 days ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 6 * 24 * 60 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('6日前')
  })

  it('returns "X週間前" for 7 days ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('1週間前')
  })

  it('returns "X週間前" for 14 days ago', () => {
    const now = makeNow()
    const past = new Date(now.getTime() - 14 * 24 * 60 * 60_000)
    expect(relativeTime(past.toISOString(), now)).toBe('2週間前')
  })

  it('uses current Date when now is not provided', () => {
    // Just check it does not throw and returns a string
    const result = relativeTime(new Date().toISOString())
    expect(typeof result).toBe('string')
  })
})
