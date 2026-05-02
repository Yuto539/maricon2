import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPartnerRepository } from './InMemoryPartnerRepository'
import type { Partner } from '@/lib/types'

const makeCreateData = (overrides: Partial<Omit<Partner, 'id' | 'createdAt' | 'bondLevel' | 'streakDays'>> = {}) =>
  ({
    userId: 'user-1',
    nickname: 'Hana',
    tags: ['funny', 'kind'],
    status: 'active' as const,
    ...overrides,
  })

describe('InMemoryPartnerRepository', () => {
  let repo: InMemoryPartnerRepository

  beforeEach(() => {
    repo = new InMemoryPartnerRepository()
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns a partner with generated id and defaults', async () => {
      const result = await repo.create(makeCreateData())
      expect(result.id).toBeTruthy()
      expect(result.bondLevel).toBe(0)
      expect(result.streakDays).toBe(0)
      expect(result.createdAt).toBeTruthy()
      expect(result.nickname).toBe('Hana')
    })

    it('generates unique ids for each partner', async () => {
      const a = await repo.create(makeCreateData())
      const b = await repo.create(makeCreateData({ nickname: 'Yuki' }))
      expect(a.id).not.toBe(b.id)
    })

    it('stores optional fields correctly', async () => {
      const result = await repo.create(
        makeCreateData({ age: 28, occupation: 'Teacher', metVia: 'App', profileNotes: 'Nice' }),
      )
      expect(result.age).toBe(28)
      expect(result.occupation).toBe('Teacher')
      expect(result.metVia).toBe('App')
      expect(result.profileNotes).toBe('Nice')
    })

    it('createdAt is a valid ISO string', async () => {
      const result = await repo.create(makeCreateData())
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })
  })

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the partner when id and userId match', async () => {
      const created = await repo.create(makeCreateData())
      const found = await repo.findById(created.id, 'user-1')
      expect(found).toEqual(created)
    })

    it('returns null when id does not exist', async () => {
      const found = await repo.findById('nonexistent', 'user-1')
      expect(found).toBeNull()
    })

    it('returns null when userId does not match (RLS simulation)', async () => {
      const created = await repo.create(makeCreateData())
      const found = await repo.findById(created.id, 'user-2')
      expect(found).toBeNull()
    })
  })

  // ── findAllByUser ─────────────────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('returns empty array when no partners exist', async () => {
      const result = await repo.findAllByUser('user-1')
      expect(result).toEqual([])
    })

    it('returns only partners belonging to the userId', async () => {
      await repo.create(makeCreateData({ userId: 'user-1', nickname: 'A' }))
      await repo.create(makeCreateData({ userId: 'user-2', nickname: 'B' }))
      await repo.create(makeCreateData({ userId: 'user-1', nickname: 'C' }))
      const result = await repo.findAllByUser('user-1')
      expect(result).toHaveLength(2)
      expect(result.every((p) => p.userId === 'user-1')).toBe(true)
    })

    it('returns empty array for unknown userId', async () => {
      await repo.create(makeCreateData({ userId: 'user-1' }))
      const result = await repo.findAllByUser('user-99')
      expect(result).toEqual([])
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns the modified partner', async () => {
      const created = await repo.create(makeCreateData())
      const updated = await repo.update(created.id, 'user-1', { nickname: 'Sakura' })
      expect(updated).not.toBeNull()
      expect(updated!.nickname).toBe('Sakura')
    })

    it('preserves unchanged fields', async () => {
      const created = await repo.create(makeCreateData({ age: 25 }))
      const updated = await repo.update(created.id, 'user-1', { nickname: 'Sakura' })
      expect(updated!.age).toBe(25)
      expect(updated!.userId).toBe('user-1')
    })

    it('returns null for nonexistent id', async () => {
      const result = await repo.update('ghost', 'user-1', { nickname: 'X' })
      expect(result).toBeNull()
    })

    it('returns null when userId does not match (RLS simulation)', async () => {
      const created = await repo.create(makeCreateData())
      const result = await repo.update(created.id, 'user-2', { nickname: 'X' })
      expect(result).toBeNull()
    })

    it('can update bondLevel and streakDays', async () => {
      const created = await repo.create(makeCreateData())
      const updated = await repo.update(created.id, 'user-1', { bondLevel: 5, streakDays: 3 })
      expect(updated!.bondLevel).toBe(5)
      expect(updated!.streakDays).toBe(3)
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the partner and returns true', async () => {
      const created = await repo.create(makeCreateData())
      const result = await repo.delete(created.id, 'user-1')
      expect(result).toBe(true)
      const found = await repo.findById(created.id, 'user-1')
      expect(found).toBeNull()
    })

    it('returns false for nonexistent id', async () => {
      const result = await repo.delete('ghost', 'user-1')
      expect(result).toBe(false)
    })

    it('returns false when userId does not match (RLS simulation)', async () => {
      const created = await repo.create(makeCreateData())
      const result = await repo.delete(created.id, 'user-2')
      expect(result).toBe(false)
      // partner must still exist for the real owner
      const found = await repo.findById(created.id, 'user-1')
      expect(found).not.toBeNull()
    })
  })
})
