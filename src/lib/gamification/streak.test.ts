import { describe, it, expect } from 'vitest'
import { calculateStreak } from './streak'

// We inject `today` as second arg so tests are deterministic (no Date.now() coupling)
const TODAY = '2026-05-02'

describe('calculateStreak', () => {
  // ── Empty / null-like inputs ─────────────────────────────────────────────

  it('returns 0 streak and not active for empty array', () => {
    const result = calculateStreak([], TODAY)
    expect(result.streakDays).toBe(0)
    expect(result.isActiveToday).toBe(false)
  })

  // ── isActiveToday ────────────────────────────────────────────────────────

  it('marks isActiveToday true when there is an entry for today', () => {
    const result = calculateStreak([TODAY], TODAY)
    expect(result.isActiveToday).toBe(true)
  })

  it('marks isActiveToday false when most recent entry is yesterday', () => {
    const result = calculateStreak(['2026-05-01'], TODAY)
    expect(result.isActiveToday).toBe(false)
  })

  it('marks isActiveToday false when entry is from 2 days ago', () => {
    const result = calculateStreak(['2026-04-30'], TODAY)
    expect(result.isActiveToday).toBe(false)
  })

  // ── streakDays — basic sequences ────────────────────────────────────────

  it('returns streak of 1 for a single entry today', () => {
    const result = calculateStreak([TODAY], TODAY)
    expect(result.streakDays).toBe(1)
  })

  it('returns streak of 1 for a single entry yesterday (chain not broken yet)', () => {
    // Yesterday is still part of a streak — streak = 1 (the consecutive run ending yesterday)
    const result = calculateStreak(['2026-05-01'], TODAY)
    expect(result.streakDays).toBe(1)
  })

  it('returns streak of 2 for today and yesterday', () => {
    const result = calculateStreak(['2026-05-01', TODAY], TODAY)
    expect(result.streakDays).toBe(2)
  })

  it('returns streak of 3 for three consecutive days ending today', () => {
    const result = calculateStreak(['2026-04-30', '2026-05-01', TODAY], TODAY)
    expect(result.streakDays).toBe(3)
  })

  it('returns streak of 7 for seven consecutive days ending today', () => {
    const dates = [
      '2026-04-26',
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      TODAY,
    ]
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(7)
  })

  // ── Streak breaks ────────────────────────────────────────────────────────

  it('resets streak when there is a gap of 2+ days', () => {
    // Yesterday and 3 days ago: gap on April 30 breaks the streak
    // Latest run: just yesterday = streak 1
    const result = calculateStreak(['2026-04-29', '2026-05-01'], TODAY)
    expect(result.streakDays).toBe(1)
  })

  it('counts only the most recent consecutive run', () => {
    // Long old run (Apr 1-5), gap, then Apr 30 + May 1 = streak 2
    const dates = [
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
      '2026-04-30',
      '2026-05-01',
    ]
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(2)
  })

  it('returns 0 streak when last entry is more than 1 day ago', () => {
    // Last entry 2 days ago — streak is broken and not active
    const result = calculateStreak(['2026-04-30'], TODAY)
    expect(result.streakDays).toBe(0)
  })

  // ── Duplicate dates ──────────────────────────────────────────────────────

  it('deduplicates multiple entries for the same day', () => {
    const dates = [TODAY, TODAY, TODAY]
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(1)
  })

  it('deduplicates entries across multiple same days in a streak', () => {
    const dates = [
      '2026-05-01',
      '2026-05-01', // dup
      TODAY,
      TODAY, // dup
    ]
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(2)
  })

  // ── Unsorted input ───────────────────────────────────────────────────────

  it('handles unsorted date arrays correctly', () => {
    const dates = [TODAY, '2026-04-30', '2026-05-01']
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(3)
  })

  // ── Timestamps (ISO with time component) ────────────────────────────────

  it('handles ISO datetime strings (with time component) by treating them as calendar dates', () => {
    const dates = [
      '2026-05-01T23:59:59.000Z',
      '2026-05-02T00:01:00.000Z',
    ]
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(2)
  })

  // ── Single future entry ──────────────────────────────────────────────────

  it('ignores future dates beyond today when calculating streak', () => {
    // Future date should not extend the streak
    const dates = [TODAY, '2026-05-03', '2026-05-04']
    const result = calculateStreak(dates, TODAY)
    // streak counting starts from today, future dates don't add days
    expect(result.streakDays).toBe(1)
  })

  // ── Large dataset ────────────────────────────────────────────────────────

  it('handles 365 consecutive days correctly', () => {
    const dates: string[] = []
    const start = new Date('2025-05-03')
    for (let i = 0; i < 365; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    // Last entry = 2026-05-02 = TODAY
    const result = calculateStreak(dates, TODAY)
    expect(result.streakDays).toBe(365)
    expect(result.isActiveToday).toBe(true)
  })
})
