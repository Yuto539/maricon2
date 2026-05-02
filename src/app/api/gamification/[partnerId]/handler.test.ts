import { describe, it, expect, vi } from 'vitest'
import {
  handleGamificationRequest,
  type GamificationHandlerDeps,
  type DailyChallenge,
} from './handler'
import type { Partner, Message, Badge } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

const PARTNER_ID = 'partner-gam-001'
const USER_ID = 'user-eee'
const TODAY = '2026-05-02'

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: PARTNER_ID,
    userId: USER_ID,
    nickname: 'Yuki',
    tags: [],
    status: 'active',
    bondLevel: 42,
    streakDays: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeMessages(count: number, daysBack = 0): Message[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date('2026-05-02T10:00:00.000Z')
    d.setDate(d.getDate() - daysBack - i)
    return {
      id: `msg-${i}`,
      partnerId: PARTNER_ID,
      sender: i % 2 === 0 ? 'me' : 'partner',
      content: `Message ${i}`,
      sentAt: d.toISOString(),
      sentiment: 0.5,
      createdAt: d.toISOString(),
    }
  })
}

function makeBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: 'badge-001',
    userId: USER_ID,
    badgeType: 'first_message',
    earnedAt: '2026-01-05T00:00:00.000Z',
    ...overrides,
  }
}

function makeChallenge(overrides: Partial<DailyChallenge> = {}): DailyChallenge {
  return {
    id: 'challenge-001',
    challengeText: 'Send a compliment today',
    completed: false,
    ...overrides,
  }
}

function makeDeps(overrides: Partial<GamificationHandlerDeps> = {}): GamificationHandlerDeps {
  return {
    getPartner: vi.fn().mockResolvedValue(makePartner()),
    getMessages: vi.fn().mockResolvedValue(makeMessages(6)),
    getBadges: vi.fn().mockResolvedValue([makeBadge()]),
    getDailyChallenge: vi.fn().mockResolvedValue(makeChallenge()),
    today: TODAY,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('handleGamificationRequest', () => {
  // ── 404 Partner not found ─────────────────────────────────────────────

  it('returns 404 when partner not found', async () => {
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(null) })
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    expect(result.status).toBe(404)
    expect((result.body as { error: string }).error).toBe('Partner not found')
  })

  // ── 200 Success — shape ───────────────────────────────────────────────

  it('returns 200 with expected fields', async () => {
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    expect(result.status).toBe(200)
    const body = result.body as Record<string, unknown>
    expect(typeof body.bondLevel).toBe('number')
    expect(typeof body.bondLevelLabel).toBe('string')
    expect(typeof body.streakDays).toBe('number')
    expect(body.healthScore).toBeDefined()
    expect(Array.isArray(body.badges)).toBe(true)
  })

  it('dailyChallenge is included when it exists', async () => {
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    const body = result.body as { dailyChallenge: unknown }
    expect(body.dailyChallenge).toBeDefined()
  })

  it('dailyChallenge is null when none returned', async () => {
    const deps = makeDeps({ getDailyChallenge: vi.fn().mockResolvedValue(null) })
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    const body = result.body as { dailyChallenge: null }
    expect(body.dailyChallenge).toBeNull()
  })

  // ── Bond level ────────────────────────────────────────────────────────

  it('bondLevel is a number between 0 and 100', async () => {
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    const { bondLevel } = result.body as { bondLevel: number }
    expect(bondLevel).toBeGreaterThanOrEqual(0)
    expect(bondLevel).toBeLessThanOrEqual(100)
  })

  it('bondLevelLabel is a valid Japanese label', async () => {
    const validLabels = ['はじめまして', '知り合い', '友達感覚', '気になる存在', '深い関係']
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    const { bondLevelLabel } = result.body as { bondLevelLabel: string }
    expect(validLabels).toContain(bondLevelLabel)
  })

  // ── Streak ────────────────────────────────────────────────────────────

  it('streakDays is non-negative integer', async () => {
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    const { streakDays } = result.body as { streakDays: number }
    expect(streakDays).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(streakDays)).toBe(true)
  })

  it('streak is 0 when no messages', async () => {
    const deps = makeDeps({ getMessages: vi.fn().mockResolvedValue([]) })
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    const { streakDays } = result.body as { streakDays: number }
    expect(streakDays).toBe(0)
  })

  // ── Health score ──────────────────────────────────────────────────────

  it('healthScore has score, breakdown, and trend', async () => {
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    const { healthScore } = result.body as {
      healthScore: { score: number; breakdown: unknown; trend: string }
    }
    expect(typeof healthScore.score).toBe('number')
    expect(healthScore.breakdown).toBeDefined()
    expect(['improving', 'stable', 'declining']).toContain(healthScore.trend)
  })

  it('healthScore is 0 when no messages', async () => {
    const deps = makeDeps({ getMessages: vi.fn().mockResolvedValue([]) })
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    const { healthScore } = result.body as { healthScore: { score: number } }
    expect(healthScore.score).toBe(0)
  })

  // ── Badges ────────────────────────────────────────────────────────────

  it('badges array is empty when user has no badges', async () => {
    const deps = makeDeps({ getBadges: vi.fn().mockResolvedValue([]) })
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    const { badges } = result.body as { badges: unknown[] }
    expect(badges).toHaveLength(0)
  })

  it('badges contain badgeType and earnedAt', async () => {
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, makeDeps())
    const { badges } = result.body as {
      badges: Array<{ badgeType: string; earnedAt: string }>
    }
    expect(badges[0].badgeType).toBe('first_message')
    expect(typeof badges[0].earnedAt).toBe('string')
  })

  // ── Dependency calls ──────────────────────────────────────────────────

  it('calls getPartner with correct partnerId and userId', async () => {
    const getPartner = vi.fn().mockResolvedValue(makePartner())
    const deps = makeDeps({ getPartner })
    await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    expect(getPartner).toHaveBeenCalledWith(PARTNER_ID, USER_ID)
  })

  it('calls getDailyChallenge with today from deps', async () => {
    const getDailyChallenge = vi.fn().mockResolvedValue(makeChallenge())
    const deps = makeDeps({ getDailyChallenge, today: '2026-03-10' })
    await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    expect(getDailyChallenge).toHaveBeenCalledWith(USER_ID, PARTNER_ID, '2026-03-10')
  })

  it('calls getBadges with userId', async () => {
    const getBadges = vi.fn().mockResolvedValue([])
    const deps = makeDeps({ getBadges })
    await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    expect(getBadges).toHaveBeenCalledWith(USER_ID)
  })

  it('calls getMessages with partnerId', async () => {
    const getMessages = vi.fn().mockResolvedValue([])
    const deps = makeDeps({ getMessages })
    await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    expect(getMessages).toHaveBeenCalledWith(PARTNER_ID)
  })

  // ── Edge cases ────────────────────────────────────────────────────────

  it('uses system date when today is not provided in deps', async () => {
    const { today: _today, ...depsWithoutToday } = makeDeps()
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, depsWithoutToday)
    // Should still return 200 — just uses real system date
    expect(result.status).toBe(200)
  })

  it('handles messages without sentiment field (defaults to 0)', async () => {
    const messagesWithoutSentiment = makeMessages(3).map(
      ({ sentiment: _s, ...m }) => m as Message,
    )
    const deps = makeDeps({ getMessages: vi.fn().mockResolvedValue(messagesWithoutSentiment) })
    const result = await handleGamificationRequest(PARTNER_ID, USER_ID, deps)
    expect(result.status).toBe(200)
    const { healthScore } = result.body as { healthScore: { score: number } }
    expect(typeof healthScore.score).toBe('number')
  })
})
