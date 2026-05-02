import { describe, it, expect } from 'vitest'
import {
  canMakeAIRequest,
  getRemainingRequests,
  getMaxRequestsPerDay,
  type UsageRecord,
} from './rateLimit'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUsage(
  overrides: Partial<UsageRecord> = {},
): UsageRecord {
  return {
    userId: 'user-1',
    date: '2026-05-02',
    aiRequestsToday: 0,
    subscriptionTier: 'free',
    ...overrides,
  }
}

// ── getMaxRequestsPerDay ───────────────────────────────────────────────────

describe('getMaxRequestsPerDay', () => {
  it('returns 5 for free tier', () => {
    expect(getMaxRequestsPerDay('free')).toBe(5)
  })

  it('returns -1 (unlimited) for pro tier', () => {
    expect(getMaxRequestsPerDay('pro')).toBe(-1)
  })

  it('returns -1 (unlimited) for couples tier', () => {
    expect(getMaxRequestsPerDay('couples')).toBe(-1)
  })
})

// ── canMakeAIRequest ───────────────────────────────────────────────────────

describe('canMakeAIRequest', () => {
  // Free tier happy path
  it('returns true when free user has 0 requests used today', () => {
    expect(canMakeAIRequest(makeUsage({ aiRequestsToday: 0 }))).toBe(true)
  })

  it('returns true when free user has used 4 requests (one remaining)', () => {
    expect(canMakeAIRequest(makeUsage({ aiRequestsToday: 4 }))).toBe(true)
  })

  // Free tier limit boundary
  it('returns false when free user has used exactly 5 requests', () => {
    expect(canMakeAIRequest(makeUsage({ aiRequestsToday: 5 }))).toBe(false)
  })

  it('returns false when free user has used more than 5 requests', () => {
    expect(canMakeAIRequest(makeUsage({ aiRequestsToday: 99 }))).toBe(false)
  })

  // Pro tier — always allowed
  it('returns true for pro user with 0 requests', () => {
    expect(
      canMakeAIRequest(makeUsage({ subscriptionTier: 'pro', aiRequestsToday: 0 })),
    ).toBe(true)
  })

  it('returns true for pro user with 100 requests', () => {
    expect(
      canMakeAIRequest(makeUsage({ subscriptionTier: 'pro', aiRequestsToday: 100 })),
    ).toBe(true)
  })

  // Couples tier — always allowed
  it('returns true for couples user with 0 requests', () => {
    expect(
      canMakeAIRequest(
        makeUsage({ subscriptionTier: 'couples', aiRequestsToday: 0 }),
      ),
    ).toBe(true)
  })

  it('returns true for couples user with 1000 requests', () => {
    expect(
      canMakeAIRequest(
        makeUsage({ subscriptionTier: 'couples', aiRequestsToday: 1000 }),
      ),
    ).toBe(true)
  })

  // Free tier: exactly at limit
  it('returns false when free user is at exactly the daily limit', () => {
    expect(canMakeAIRequest(makeUsage({ aiRequestsToday: 5 }))).toBe(false)
  })

  // Free tier: 1 below limit
  it('returns true when free user has used 1 fewer than the limit', () => {
    expect(canMakeAIRequest(makeUsage({ aiRequestsToday: 4 }))).toBe(true)
  })
})

// ── getRemainingRequests ───────────────────────────────────────────────────

describe('getRemainingRequests', () => {
  // Free tier
  it('returns 5 for free user with 0 used', () => {
    expect(getRemainingRequests(makeUsage({ aiRequestsToday: 0 }))).toBe(5)
  })

  it('returns 3 for free user with 2 used', () => {
    expect(getRemainingRequests(makeUsage({ aiRequestsToday: 2 }))).toBe(3)
  })

  it('returns 0 for free user who exhausted daily limit', () => {
    expect(getRemainingRequests(makeUsage({ aiRequestsToday: 5 }))).toBe(0)
  })

  it('returns 0 (not negative) when free user exceeded limit somehow', () => {
    expect(getRemainingRequests(makeUsage({ aiRequestsToday: 10 }))).toBe(0)
  })

  // Pro tier — unlimited
  it('returns -1 for pro user (unlimited)', () => {
    expect(
      getRemainingRequests(
        makeUsage({ subscriptionTier: 'pro', aiRequestsToday: 999 }),
      ),
    ).toBe(-1)
  })

  // Couples tier — unlimited
  it('returns -1 for couples user (unlimited)', () => {
    expect(
      getRemainingRequests(
        makeUsage({ subscriptionTier: 'couples', aiRequestsToday: 0 }),
      ),
    ).toBe(-1)
  })
})
