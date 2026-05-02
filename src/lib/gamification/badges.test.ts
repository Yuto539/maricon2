import { describe, it, expect } from 'vitest'
import { evaluateBadges, UserStats } from './badges'

const ZERO_STATS: UserStats = {
  messagesCount: 0,
  streakDays: 0,
  duoSessionsCount: 0,
  topicCategoriesUsed: 0,
  aiRequestsCount: 0,
}

describe('evaluateBadges', () => {
  // ── Zero stats → no badges ────────────────────────────────────────────────

  it('returns empty array when all stats are zero', () => {
    expect(evaluateBadges(ZERO_STATS)).toEqual([])
  })

  // ── first_message ─────────────────────────────────────────────────────────

  it('awards first_message when messagesCount is 1', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, messagesCount: 1 })
    expect(badges).toContain('first_message')
  })

  it('awards first_message when messagesCount is greater than 1', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, messagesCount: 100 })
    expect(badges).toContain('first_message')
  })

  it('does not award first_message when messagesCount is 0', () => {
    const badges = evaluateBadges(ZERO_STATS)
    expect(badges).not.toContain('first_message')
  })

  // ── streak_3 ──────────────────────────────────────────────────────────────

  it('awards streak_3 when streakDays is exactly 3', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 3 })
    expect(badges).toContain('streak_3')
  })

  it('awards streak_3 when streakDays exceeds 3', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 10 })
    expect(badges).toContain('streak_3')
  })

  it('does not award streak_3 when streakDays is 2', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 2 })
    expect(badges).not.toContain('streak_3')
  })

  // ── streak_7 ──────────────────────────────────────────────────────────────

  it('awards streak_7 when streakDays is exactly 7', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 7 })
    expect(badges).toContain('streak_7')
  })

  it('awards streak_7 when streakDays exceeds 7', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 100 })
    expect(badges).toContain('streak_7')
  })

  it('does not award streak_7 when streakDays is 6', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 6 })
    expect(badges).not.toContain('streak_7')
  })

  // ── streak_30 ─────────────────────────────────────────────────────────────

  it('awards streak_30 when streakDays is exactly 30', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 30 })
    expect(badges).toContain('streak_30')
  })

  it('awards streak_30 when streakDays exceeds 30', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 365 })
    expect(badges).toContain('streak_30')
  })

  it('does not award streak_30 when streakDays is 29', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, streakDays: 29 })
    expect(badges).not.toContain('streak_30')
  })

  // ── duo_first ─────────────────────────────────────────────────────────────

  it('awards duo_first when duoSessionsCount is 1', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, duoSessionsCount: 1 })
    expect(badges).toContain('duo_first')
  })

  it('awards duo_first when duoSessionsCount is greater than 1', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, duoSessionsCount: 50 })
    expect(badges).toContain('duo_first')
  })

  it('does not award duo_first when duoSessionsCount is 0', () => {
    const badges = evaluateBadges(ZERO_STATS)
    expect(badges).not.toContain('duo_first')
  })

  // ── topic_master ──────────────────────────────────────────────────────────

  it('awards topic_master when topicCategoriesUsed is exactly 10', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, topicCategoriesUsed: 10 })
    expect(badges).toContain('topic_master')
  })

  it('awards topic_master when topicCategoriesUsed exceeds 10', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, topicCategoriesUsed: 20 })
    expect(badges).toContain('topic_master')
  })

  it('does not award topic_master when topicCategoriesUsed is 9', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, topicCategoriesUsed: 9 })
    expect(badges).not.toContain('topic_master')
  })

  // ── first_ai_use ──────────────────────────────────────────────────────────

  it('awards first_ai_use when aiRequestsCount is 1', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, aiRequestsCount: 1 })
    expect(badges).toContain('first_ai_use')
  })

  it('awards first_ai_use when aiRequestsCount is greater than 1', () => {
    const badges = evaluateBadges({ ...ZERO_STATS, aiRequestsCount: 999 })
    expect(badges).toContain('first_ai_use')
  })

  it('does not award first_ai_use when aiRequestsCount is 0', () => {
    const badges = evaluateBadges(ZERO_STATS)
    expect(badges).not.toContain('first_ai_use')
  })

  // ── Multiple badges at once ───────────────────────────────────────────────

  it('awards all badges for a power user', () => {
    const stats: UserStats = {
      messagesCount: 500,
      streakDays: 30,
      duoSessionsCount: 5,
      topicCategoriesUsed: 15,
      aiRequestsCount: 100,
    }
    const badges = evaluateBadges(stats)
    expect(badges).toContain('first_message')
    expect(badges).toContain('streak_3')
    expect(badges).toContain('streak_7')
    expect(badges).toContain('streak_30')
    expect(badges).toContain('duo_first')
    expect(badges).toContain('topic_master')
    expect(badges).toContain('first_ai_use')
    expect(badges).toHaveLength(7)
  })

  it('awards only streak badges that are earned (streak 7 but not 30)', () => {
    const stats: UserStats = {
      ...ZERO_STATS,
      streakDays: 7,
    }
    const badges = evaluateBadges(stats)
    expect(badges).toContain('streak_3')
    expect(badges).toContain('streak_7')
    expect(badges).not.toContain('streak_30')
  })

  it('returns unique badge IDs (no duplicates)', () => {
    const stats: UserStats = {
      messagesCount: 100,
      streakDays: 30,
      duoSessionsCount: 10,
      topicCategoriesUsed: 20,
      aiRequestsCount: 50,
    }
    const badges = evaluateBadges(stats)
    const unique = [...new Set(badges)]
    expect(badges).toHaveLength(unique.length)
  })

  // ── Boundary: exactly at threshold ───────────────────────────────────────

  it('treats exact threshold values as qualifying', () => {
    // All at minimum qualifying values
    const stats: UserStats = {
      messagesCount: 1,
      streakDays: 3,
      duoSessionsCount: 1,
      topicCategoriesUsed: 10,
      aiRequestsCount: 1,
    }
    const badges = evaluateBadges(stats)
    expect(badges).toContain('first_message')
    expect(badges).toContain('streak_3')
    expect(badges).toContain('duo_first')
    expect(badges).toContain('topic_master')
    expect(badges).toContain('first_ai_use')
  })
})
