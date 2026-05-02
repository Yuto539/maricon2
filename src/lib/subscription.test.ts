import { describe, it, expect } from 'vitest'
import {
  canAddPartner,
  canUseDuoFeatures,
  canViewSharedTimeline,
  isSubscriptionActive,
  type UserSubscription,
} from './subscription'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSub(overrides: Partial<UserSubscription> = {}): UserSubscription {
  return {
    tier: 'free',
    expiresAt: null,
    partnersCount: 0,
    ...overrides,
  }
}

const FIXED_NOW = new Date('2026-05-02T12:00:00.000Z')

// ── canAddPartner ──────────────────────────────────────────────────────────

describe('canAddPartner', () => {
  // Free tier: max 2
  it('returns true for free user with 0 partners', () => {
    expect(canAddPartner(makeSub({ tier: 'free', partnersCount: 0 }))).toBe(true)
  })

  it('returns true for free user with 1 partner', () => {
    expect(canAddPartner(makeSub({ tier: 'free', partnersCount: 1 }))).toBe(true)
  })

  it('returns false for free user with exactly 2 partners (at limit)', () => {
    expect(canAddPartner(makeSub({ tier: 'free', partnersCount: 2 }))).toBe(false)
  })

  it('returns false for free user with 3 partners (over limit)', () => {
    expect(canAddPartner(makeSub({ tier: 'free', partnersCount: 3 }))).toBe(false)
  })

  // Pro tier: unlimited
  it('returns true for pro user with 0 partners', () => {
    expect(canAddPartner(makeSub({ tier: 'pro', partnersCount: 0 }))).toBe(true)
  })

  it('returns true for pro user with 100 partners', () => {
    expect(canAddPartner(makeSub({ tier: 'pro', partnersCount: 100 }))).toBe(true)
  })

  // Couples tier: unlimited
  it('returns true for couples user with 0 partners', () => {
    expect(canAddPartner(makeSub({ tier: 'couples', partnersCount: 0 }))).toBe(true)
  })

  it('returns true for couples user with 50 partners', () => {
    expect(canAddPartner(makeSub({ tier: 'couples', partnersCount: 50 }))).toBe(true)
  })
})

// ── canUseDuoFeatures ──────────────────────────────────────────────────────

describe('canUseDuoFeatures', () => {
  it('returns true for free tier (viral mechanic)', () => {
    expect(canUseDuoFeatures(makeSub({ tier: 'free' }))).toBe(true)
  })

  it('returns true for pro tier', () => {
    expect(canUseDuoFeatures(makeSub({ tier: 'pro' }))).toBe(true)
  })

  it('returns true for couples tier', () => {
    expect(canUseDuoFeatures(makeSub({ tier: 'couples' }))).toBe(true)
  })
})

// ── canViewSharedTimeline ──────────────────────────────────────────────────

describe('canViewSharedTimeline', () => {
  it('returns false for free tier', () => {
    expect(canViewSharedTimeline(makeSub({ tier: 'free' }))).toBe(false)
  })

  it('returns false for pro tier', () => {
    expect(canViewSharedTimeline(makeSub({ tier: 'pro' }))).toBe(false)
  })

  it('returns true for couples tier only', () => {
    expect(canViewSharedTimeline(makeSub({ tier: 'couples' }))).toBe(true)
  })
})

// ── isSubscriptionActive ───────────────────────────────────────────────────

describe('isSubscriptionActive', () => {
  // Free tier: always active
  it('returns true for free tier with no expiresAt', () => {
    expect(
      isSubscriptionActive(makeSub({ tier: 'free', expiresAt: null }), FIXED_NOW),
    ).toBe(true)
  })

  it('returns true for free tier even with a past expiresAt', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'free', expiresAt: '2025-01-01T00:00:00.000Z' }),
        FIXED_NOW,
      ),
    ).toBe(true)
  })

  // Pro tier: no expiresAt = active
  it('returns true for pro with null expiresAt', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'pro', expiresAt: null }),
        FIXED_NOW,
      ),
    ).toBe(true)
  })

  it('returns true for pro with undefined expiresAt', () => {
    expect(
      isSubscriptionActive(
        { tier: 'pro', partnersCount: 0 },
        FIXED_NOW,
      ),
    ).toBe(true)
  })

  it('returns true for pro when expiresAt is in the future', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'pro', expiresAt: '2027-01-01T00:00:00.000Z' }),
        FIXED_NOW,
      ),
    ).toBe(true)
  })

  it('returns false for pro when expiresAt is in the past', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'pro', expiresAt: '2025-01-01T00:00:00.000Z' }),
        FIXED_NOW,
      ),
    ).toBe(false)
  })

  it('returns false for pro when expiresAt is exactly now (boundary)', () => {
    expect(
      isSubscriptionActive(
        makeSub({
          tier: 'pro',
          expiresAt: '2026-05-02T12:00:00.000Z',
        }),
        FIXED_NOW,
      ),
    ).toBe(false)
  })

  // Couples tier
  it('returns true for couples with null expiresAt', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'couples', expiresAt: null }),
        FIXED_NOW,
      ),
    ).toBe(true)
  })

  it('returns true for couples when expiresAt is 1 ms in the future', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'couples', expiresAt: '2026-05-02T12:00:00.001Z' }),
        FIXED_NOW,
      ),
    ).toBe(true)
  })

  it('returns false for couples when expiresAt is in the past', () => {
    expect(
      isSubscriptionActive(
        makeSub({ tier: 'couples', expiresAt: '2020-01-01T00:00:00.000Z' }),
        FIXED_NOW,
      ),
    ).toBe(false)
  })

  it('uses system clock when no "now" is provided (smoke test)', () => {
    const futureExpiry = new Date(Date.now() + 86_400_000).toISOString()
    expect(() =>
      isSubscriptionActive(makeSub({ tier: 'pro', expiresAt: futureExpiry })),
    ).not.toThrow()
    expect(
      isSubscriptionActive(makeSub({ tier: 'pro', expiresAt: futureExpiry })),
    ).toBe(true)
  })
})
