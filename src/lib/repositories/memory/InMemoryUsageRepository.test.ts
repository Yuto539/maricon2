import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryUsageRepository } from './InMemoryUsageRepository'

describe('InMemoryUsageRepository', () => {
  let repo: InMemoryUsageRepository

  beforeEach(() => {
    repo = new InMemoryUsageRepository()
  })

  // ── getToday ──────────────────────────────────────────────────────────────

  describe('getToday', () => {
    it('returns a zero-count record for a new userId + date', async () => {
      const result = await repo.getToday('user-1', '2024-01-15')
      expect(result.userId).toBe('user-1')
      expect(result.date).toBe('2024-01-15')
      expect(result.aiRequestsToday).toBe(0)
      expect(result.subscriptionTier).toBe('free')
    })

    it('returns a UsageRecord with all required fields', async () => {
      const result = await repo.getToday('user-1', '2024-01-15')
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('date')
      expect(result).toHaveProperty('aiRequestsToday')
      expect(result).toHaveProperty('subscriptionTier')
    })

    it('returns the current count after increments', async () => {
      await repo.increment('user-1', '2024-01-15')
      await repo.increment('user-1', '2024-01-15')
      const result = await repo.getToday('user-1', '2024-01-15')
      expect(result.aiRequestsToday).toBe(2)
    })

    it('isolates counts per user', async () => {
      await repo.increment('user-1', '2024-01-15')
      await repo.increment('user-1', '2024-01-15')
      await repo.increment('user-2', '2024-01-15')
      const r1 = await repo.getToday('user-1', '2024-01-15')
      const r2 = await repo.getToday('user-2', '2024-01-15')
      expect(r1.aiRequestsToday).toBe(2)
      expect(r2.aiRequestsToday).toBe(1)
    })

    it('isolates counts per date', async () => {
      await repo.increment('user-1', '2024-01-14')
      await repo.increment('user-1', '2024-01-15')
      await repo.increment('user-1', '2024-01-15')
      const r14 = await repo.getToday('user-1', '2024-01-14')
      const r15 = await repo.getToday('user-1', '2024-01-15')
      expect(r14.aiRequestsToday).toBe(1)
      expect(r15.aiRequestsToday).toBe(2)
    })
  })

  // ── increment ─────────────────────────────────────────────────────────────

  describe('increment', () => {
    it('increments from 0 to 1 on first call', async () => {
      await repo.increment('user-1', '2024-01-15')
      const result = await repo.getToday('user-1', '2024-01-15')
      expect(result.aiRequestsToday).toBe(1)
    })

    it('increments multiple times correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.increment('user-1', '2024-01-15')
      }
      const result = await repo.getToday('user-1', '2024-01-15')
      expect(result.aiRequestsToday).toBe(5)
    })

    it('returns void (no return value)', async () => {
      const result = await repo.increment('user-1', '2024-01-15')
      expect(result).toBeUndefined()
    })
  })
})
