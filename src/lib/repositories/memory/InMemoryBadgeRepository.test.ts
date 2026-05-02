import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryBadgeRepository } from './InMemoryBadgeRepository'

describe('InMemoryBadgeRepository', () => {
  let repo: InMemoryBadgeRepository

  beforeEach(() => {
    repo = new InMemoryBadgeRepository()
  })

  // ── awardBadge ────────────────────────────────────────────────────────────

  describe('awardBadge', () => {
    it('creates a badge with generated id and earnedAt', async () => {
      const badge = await repo.awardBadge('user-1', 'first_message')
      expect(badge.id).toBeTruthy()
      expect(badge.earnedAt).toBeTruthy()
      expect(new Date(badge.earnedAt).toISOString()).toBe(badge.earnedAt)
    })

    it('stores userId and badgeType on the badge', async () => {
      const badge = await repo.awardBadge('user-1', 'first_message')
      expect(badge.userId).toBe('user-1')
      expect(badge.badgeType).toBe('first_message')
    })

    it('stores optional partnerId when provided', async () => {
      const badge = await repo.awardBadge('user-1', 'partner_milestone', 'partner-42')
      expect(badge.partnerId).toBe('partner-42')
    })

    it('partnerId is undefined when not provided', async () => {
      const badge = await repo.awardBadge('user-1', 'first_message')
      expect(badge.partnerId).toBeUndefined()
    })

    it('is idempotent: awarding the same badge twice returns the existing badge', async () => {
      const first = await repo.awardBadge('user-1', 'first_message')
      const second = await repo.awardBadge('user-1', 'first_message')
      expect(second.id).toBe(first.id)
    })

    it('allows the same badgeType for different users', async () => {
      const a = await repo.awardBadge('user-1', 'first_message')
      const b = await repo.awardBadge('user-2', 'first_message')
      expect(a.id).not.toBe(b.id)
    })

    it('allows different badgeTypes for the same user', async () => {
      const a = await repo.awardBadge('user-1', 'first_message')
      const b = await repo.awardBadge('user-1', 'streak_7')
      expect(a.id).not.toBe(b.id)
    })
  })

  // ── hasBadge ──────────────────────────────────────────────────────────────

  describe('hasBadge', () => {
    it('returns false when user has no badges', async () => {
      const result = await repo.hasBadge('user-1', 'first_message')
      expect(result).toBe(false)
    })

    it('returns true after the badge is awarded', async () => {
      await repo.awardBadge('user-1', 'first_message')
      const result = await repo.hasBadge('user-1', 'first_message')
      expect(result).toBe(true)
    })

    it('returns false for a different badgeType', async () => {
      await repo.awardBadge('user-1', 'first_message')
      const result = await repo.hasBadge('user-1', 'streak_7')
      expect(result).toBe(false)
    })

    it('returns false for a different userId', async () => {
      await repo.awardBadge('user-1', 'first_message')
      const result = await repo.hasBadge('user-2', 'first_message')
      expect(result).toBe(false)
    })
  })

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns empty array for unknown userId', async () => {
      const result = await repo.findByUser('user-1')
      expect(result).toEqual([])
    })

    it('returns all badges for the given user', async () => {
      await repo.awardBadge('user-1', 'first_message')
      await repo.awardBadge('user-1', 'streak_7')
      await repo.awardBadge('user-2', 'first_message')
      const result = await repo.findByUser('user-1')
      expect(result).toHaveLength(2)
      expect(result.every((b) => b.userId === 'user-1')).toBe(true)
    })

    it('idempotent award does not duplicate badges in findByUser', async () => {
      await repo.awardBadge('user-1', 'first_message')
      await repo.awardBadge('user-1', 'first_message')
      const result = await repo.findByUser('user-1')
      expect(result).toHaveLength(1)
    })
  })
})
