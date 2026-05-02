import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryDuoSessionRepository } from './InMemoryDuoSessionRepository'
import type { NewDuoSession, DuoSession } from '@/lib/types'

const makeNewSession = (overrides: Partial<NewDuoSession> = {}): NewDuoSession => ({
  partnerId: 'partner-1',
  creatorId: 'user-1',
  sessionType: 'answer_card',
  token: 'tok-abc123',
  questions: [{ id: 'q1', text: 'Favorite food?' }],
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  ...overrides,
})

describe('InMemoryDuoSessionRepository', () => {
  let repo: InMemoryDuoSessionRepository

  beforeEach(() => {
    repo = new InMemoryDuoSessionRepository()
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns a DuoSession with generated id and createdAt', async () => {
      const result = await repo.create(makeNewSession())
      expect(result.id).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })

    it('sets partnerViewed to false by default', async () => {
      const result = await repo.create(makeNewSession())
      expect(result.partnerViewed).toBe(false)
    })

    it('respects partnerViewed override when provided', async () => {
      const result = await repo.create(makeNewSession({ partnerViewed: true }))
      expect(result.partnerViewed).toBe(true)
    })

    it('preserves all fields from NewDuoSession', async () => {
      const data = makeNewSession({
        token: 'tok-xyz',
        sessionType: 'quiz',
        questions: [{ id: 'q1', text: 'Q1', options: ['A', 'B'] }],
      })
      const result = await repo.create(data)
      expect(result.token).toBe('tok-xyz')
      expect(result.sessionType).toBe('quiz')
      expect(result.questions[0].options).toEqual(['A', 'B'])
    })

    it('generates unique ids for concurrent sessions', async () => {
      const a = await repo.create(makeNewSession({ token: 'tok-1' }))
      const b = await repo.create(makeNewSession({ token: 'tok-2' }))
      expect(a.id).not.toBe(b.id)
    })
  })

  // ── findByToken ───────────────────────────────────────────────────────────

  describe('findByToken', () => {
    it('returns the session for the given token', async () => {
      const created = await repo.create(makeNewSession({ token: 'tok-find-me' }))
      const found = await repo.findByToken('tok-find-me')
      expect(found).toEqual(created)
    })

    it('returns null for an unknown token', async () => {
      const found = await repo.findByToken('ghost-token')
      expect(found).toBeNull()
    })

    it('returns the correct session when multiple sessions exist', async () => {
      await repo.create(makeNewSession({ token: 'tok-A' }))
      const b = await repo.create(makeNewSession({ token: 'tok-B' }))
      await repo.create(makeNewSession({ token: 'tok-C' }))
      const found = await repo.findByToken('tok-B')
      expect(found).toEqual(b)
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('merges partial updates and returns the updated session', async () => {
      const created = await repo.create(makeNewSession())
      const updated = await repo.update(created.id, { partnerAnswers: { q1: 'Sushi' } })
      expect(updated.partnerAnswers).toEqual({ q1: 'Sushi' })
    })

    it('preserves fields not included in update', async () => {
      const created = await repo.create(makeNewSession())
      const updated = await repo.update(created.id, { partnerViewed: true })
      expect(updated.token).toBe(created.token)
      expect(updated.creatorId).toBe(created.creatorId)
      expect(updated.partnerViewed).toBe(true)
    })

    it('can set revealedAt on the session', async () => {
      const created = await repo.create(makeNewSession())
      const revealedAt = new Date().toISOString()
      const updated = await repo.update(created.id, { revealedAt })
      expect(updated.revealedAt).toBe(revealedAt)
    })

    it('updated session is retrievable by token', async () => {
      const created = await repo.create(makeNewSession({ token: 'tok-upd' }))
      await repo.update(created.id, { partnerAnswers: { q1: 'Ramen' } })
      const found = await repo.findByToken('tok-upd')
      expect(found!.partnerAnswers).toEqual({ q1: 'Ramen' })
    })

    it('throws when the session id does not exist', async () => {
      await expect(
        repo.update('nonexistent', { partnerViewed: true }),
      ).rejects.toThrow()
    })
  })
})
