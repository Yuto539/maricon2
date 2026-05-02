import { describe, it, expect } from 'vitest'
import {
  calculateHealthScore,
  ConversationMessage,
  HealthScoreResult,
} from './score'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeMsg(
  sender: 'me' | 'partner',
  sentAt: string,
  sentiment = 0,
): ConversationMessage {
  return { sender, sentAt, sentiment }
}

// Build an alternating conversation (me/partner) spaced `intervalMinutes` apart
function buildConversation(
  count: number,
  intervalMinutes: number,
  baseTime = '2026-05-02T10:00:00Z',
): ConversationMessage[] {
  const base = new Date(baseTime).getTime()
  return Array.from({ length: count }, (_, i) => ({
    sender: i % 2 === 0 ? 'me' : ('partner' as 'me' | 'partner'),
    sentAt: new Date(base + i * intervalMinutes * 60_000).toISOString(),
    sentiment: 0.5,
  }))
}

// ── Empty / minimal input ──────────────────────────────────────────────────

describe('calculateHealthScore', () => {
  it('returns a score of 0 and "stable" trend for empty array', () => {
    const result = calculateHealthScore([])
    expect(result.score).toBe(0)
    expect(result.trend).toBe('stable')
  })

  it('returns all breakdown values between 0 and 100 for empty array', () => {
    const result = calculateHealthScore([])
    const { breakdown } = result
    expect(breakdown.replyInterval).toBeGreaterThanOrEqual(0)
    expect(breakdown.replyInterval).toBeLessThanOrEqual(100)
    expect(breakdown.selfDisclosureBalance).toBeGreaterThanOrEqual(0)
    expect(breakdown.selfDisclosureBalance).toBeLessThanOrEqual(100)
    expect(breakdown.messageRatio).toBeGreaterThanOrEqual(0)
    expect(breakdown.messageRatio).toBeLessThanOrEqual(100)
  })

  it('handles a single message without throwing', () => {
    const messages = [makeMsg('me', '2026-05-02T10:00:00Z')]
    expect(() => calculateHealthScore(messages)).not.toThrow()
  })

  // ── messageRatio ────────────────────────────────────────────────────────

  it('calculates messageRatio as 100 when all messages are from "me"', () => {
    const messages = [
      makeMsg('me', '2026-05-02T10:00:00Z'),
      makeMsg('me', '2026-05-02T10:01:00Z'),
      makeMsg('me', '2026-05-02T10:02:00Z'),
    ]
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.messageRatio).toBe(100)
  })

  it('calculates messageRatio as 0 when all messages are from "partner"', () => {
    const messages = [
      makeMsg('partner', '2026-05-02T10:00:00Z'),
      makeMsg('partner', '2026-05-02T10:01:00Z'),
    ]
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.messageRatio).toBe(0)
  })

  it('calculates messageRatio as 50 for a perfectly balanced conversation', () => {
    const messages = buildConversation(4, 5) // me, partner, me, partner → 50%
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.messageRatio).toBe(50)
  })

  it('calculates messageRatio correctly for 3/4 messages from "me"', () => {
    const messages = [
      makeMsg('me', '2026-05-02T10:00:00Z'),
      makeMsg('me', '2026-05-02T10:01:00Z'),
      makeMsg('me', '2026-05-02T10:02:00Z'),
      makeMsg('partner', '2026-05-02T10:03:00Z'),
    ]
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.messageRatio).toBe(75)
  })

  // ── selfDisclosureBalance ───────────────────────────────────────────────

  it('gives selfDisclosureBalance of 100 for a perfectly balanced (50/50) conversation', () => {
    const messages = buildConversation(4, 5)
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.selfDisclosureBalance).toBe(100)
  })

  it('gives selfDisclosureBalance of 0 when all messages are from one sender', () => {
    const messages = [
      makeMsg('me', '2026-05-02T10:00:00Z'),
      makeMsg('me', '2026-05-02T10:01:00Z'),
    ]
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.selfDisclosureBalance).toBe(0)
  })

  it('gives selfDisclosureBalance of 0 when all messages are from partner', () => {
    const messages = [
      makeMsg('partner', '2026-05-02T10:00:00Z'),
      makeMsg('partner', '2026-05-02T10:01:00Z'),
    ]
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.selfDisclosureBalance).toBe(0)
  })

  it('gives partial selfDisclosureBalance for an imbalanced conversation', () => {
    // 75% me → distance from 50 = 25 → balance = 100 - 2*25 = 50
    const messages = [
      makeMsg('me', '2026-05-02T10:00:00Z'),
      makeMsg('me', '2026-05-02T10:01:00Z'),
      makeMsg('me', '2026-05-02T10:02:00Z'),
      makeMsg('partner', '2026-05-02T10:03:00Z'),
    ]
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.selfDisclosureBalance).toBe(50)
  })

  // ── replyInterval ───────────────────────────────────────────────────────

  it('gives a high replyInterval score for fast replies (< 5 minutes)', () => {
    const messages = buildConversation(6, 2) // 2-min intervals
    const { breakdown } = calculateHealthScore(messages)
    expect(breakdown.replyInterval).toBeGreaterThan(70)
  })

  it('gives a lower replyInterval score for slow replies (> 60 minutes)', () => {
    const fastMessages = buildConversation(6, 2)
    const slowMessages = buildConversation(6, 120) // 2-hour intervals
    const fastScore = calculateHealthScore(fastMessages).breakdown.replyInterval
    const slowScore = calculateHealthScore(slowMessages).breakdown.replyInterval
    expect(fastScore).toBeGreaterThan(slowScore)
  })

  // ── Overall score ───────────────────────────────────────────────────────

  it('score is a number between 0 and 100', () => {
    const messages = buildConversation(10, 5)
    const { score } = calculateHealthScore(messages)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('score is higher for a healthy conversation than an unhealthy one', () => {
    // Healthy: balanced senders, fast replies
    const healthy = buildConversation(10, 3)

    // Unhealthy: all from me, slow replies
    const unhealthy = Array.from({ length: 10 }, (_, i) => ({
      sender: 'me' as const,
      sentAt: new Date(
        new Date('2026-05-02T10:00:00Z').getTime() + i * 240 * 60_000,
      ).toISOString(),
      sentiment: -0.5,
    }))

    const healthyScore = calculateHealthScore(healthy).score
    const unhealthyScore = calculateHealthScore(unhealthy).score
    expect(healthyScore).toBeGreaterThan(unhealthyScore)
  })

  // ── Trend ───────────────────────────────────────────────────────────────

  it('returns "stable" trend for a short conversation (< 4 messages)', () => {
    const messages = buildConversation(2, 5)
    expect(calculateHealthScore(messages).trend).toBe('stable')
  })

  it('returns "improving" trend when recent sentiments are consistently higher', () => {
    const messages: ConversationMessage[] = [
      makeMsg('me', '2026-05-02T10:00:00Z', -0.8),
      makeMsg('partner', '2026-05-02T10:01:00Z', -0.6),
      makeMsg('me', '2026-05-02T10:02:00Z', 0.4),
      makeMsg('partner', '2026-05-02T10:03:00Z', 0.6),
      makeMsg('me', '2026-05-02T10:04:00Z', 0.8),
      makeMsg('partner', '2026-05-02T10:05:00Z', 0.9),
    ]
    expect(calculateHealthScore(messages).trend).toBe('improving')
  })

  it('returns "declining" trend when recent sentiments are consistently lower', () => {
    const messages: ConversationMessage[] = [
      makeMsg('me', '2026-05-02T10:00:00Z', 0.9),
      makeMsg('partner', '2026-05-02T10:01:00Z', 0.8),
      makeMsg('me', '2026-05-02T10:02:00Z', 0.6),
      makeMsg('partner', '2026-05-02T10:03:00Z', -0.2),
      makeMsg('me', '2026-05-02T10:04:00Z', -0.6),
      makeMsg('partner', '2026-05-02T10:05:00Z', -0.9),
    ]
    expect(calculateHealthScore(messages).trend).toBe('declining')
  })

  it('returns "stable" trend when sentiment is consistent throughout', () => {
    const messages: ConversationMessage[] = [
      makeMsg('me', '2026-05-02T10:00:00Z', 0.5),
      makeMsg('partner', '2026-05-02T10:01:00Z', 0.5),
      makeMsg('me', '2026-05-02T10:02:00Z', 0.5),
      makeMsg('partner', '2026-05-02T10:03:00Z', 0.5),
      makeMsg('me', '2026-05-02T10:04:00Z', 0.5),
      makeMsg('partner', '2026-05-02T10:05:00Z', 0.5),
    ]
    expect(calculateHealthScore(messages).trend).toBe('stable')
  })

  // ── Score is deterministic ───────────────────────────────────────────────

  it('returns the same score for the same input (deterministic)', () => {
    const messages = buildConversation(10, 5)
    const result1 = calculateHealthScore(messages)
    const result2 = calculateHealthScore(messages)
    expect(result1.score).toBe(result2.score)
    expect(result1.trend).toBe(result2.trend)
  })

  // ── Result shape ────────────────────────────────────────────────────────

  it('returns all required fields in the result', () => {
    const result = calculateHealthScore(buildConversation(4, 5))
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('breakdown')
    expect(result).toHaveProperty('trend')
    expect(result.breakdown).toHaveProperty('replyInterval')
    expect(result.breakdown).toHaveProperty('topicDiversity')
    expect(result.breakdown).toHaveProperty('selfDisclosureBalance')
    expect(result.breakdown).toHaveProperty('messageRatio')
  })
})
