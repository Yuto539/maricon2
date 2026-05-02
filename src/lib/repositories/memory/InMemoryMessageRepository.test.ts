import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryMessageRepository } from './InMemoryMessageRepository'
import type { Message } from '@/lib/types'

const makeCreateData = (overrides: Partial<Omit<Message, 'id' | 'createdAt'>> = {}): Omit<Message, 'id' | 'createdAt'> =>
  ({
    partnerId: 'partner-1',
    sender: 'me',
    content: 'Hello!',
    sentAt: new Date().toISOString(),
    ...overrides,
  })

describe('InMemoryMessageRepository', () => {
  let repo: InMemoryMessageRepository

  beforeEach(() => {
    repo = new InMemoryMessageRepository()
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns a message with a generated id and createdAt', async () => {
      const result = await repo.create(makeCreateData())
      expect(result.id).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })

    it('preserves all provided fields', async () => {
      const data = makeCreateData({
        content: 'Hi there',
        sender: 'partner',
        topicTags: ['food'],
        sentiment: 0.8,
      })
      const result = await repo.create(data)
      expect(result.content).toBe('Hi there')
      expect(result.sender).toBe('partner')
      expect(result.topicTags).toEqual(['food'])
      expect(result.sentiment).toBe(0.8)
    })

    it('generates unique ids for each message', async () => {
      const a = await repo.create(makeCreateData())
      const b = await repo.create(makeCreateData())
      expect(a.id).not.toBe(b.id)
    })
  })

  // ── findByPartnerId ───────────────────────────────────────────────────────

  describe('findByPartnerId', () => {
    it('returns empty array when no messages exist', async () => {
      const result = await repo.findByPartnerId('partner-1')
      expect(result).toEqual([])
    })

    it('returns all messages for the given partnerId', async () => {
      await repo.create(makeCreateData({ partnerId: 'partner-1', content: 'A' }))
      await repo.create(makeCreateData({ partnerId: 'partner-1', content: 'B' }))
      await repo.create(makeCreateData({ partnerId: 'partner-2', content: 'C' }))
      const result = await repo.findByPartnerId('partner-1')
      expect(result).toHaveLength(2)
      expect(result.every((m) => m.partnerId === 'partner-1')).toBe(true)
    })

    it('respects the optional limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create(makeCreateData({ content: `msg-${i}` }))
      }
      const result = await repo.findByPartnerId('partner-1', 3)
      expect(result).toHaveLength(3)
    })

    it('returns all messages when limit is not provided', async () => {
      for (let i = 0; i < 4; i++) {
        await repo.create(makeCreateData({ content: `msg-${i}` }))
      }
      const result = await repo.findByPartnerId('partner-1')
      expect(result).toHaveLength(4)
    })
  })

  // ── findRecentByPartnerId ─────────────────────────────────────────────────

  describe('findRecentByPartnerId', () => {
    it('returns empty array for unknown partnerId', async () => {
      const result = await repo.findRecentByPartnerId('ghost', 5)
      expect(result).toEqual([])
    })

    it('returns messages ordered by sentAt descending', async () => {
      const base = new Date('2024-01-01T00:00:00.000Z')
      await repo.create(makeCreateData({ sentAt: new Date(base.getTime() + 1000).toISOString(), content: 'second' }))
      await repo.create(makeCreateData({ sentAt: new Date(base.getTime() + 2000).toISOString(), content: 'third' }))
      await repo.create(makeCreateData({ sentAt: new Date(base.getTime()).toISOString(), content: 'first' }))

      const result = await repo.findRecentByPartnerId('partner-1', 3)
      expect(result[0].content).toBe('third')
      expect(result[1].content).toBe('second')
      expect(result[2].content).toBe('first')
    })

    it('limits the result to the given count', async () => {
      for (let i = 0; i < 6; i++) {
        await repo.create(makeCreateData({ sentAt: new Date(i * 1000).toISOString(), content: `msg-${i}` }))
      }
      const result = await repo.findRecentByPartnerId('partner-1', 4)
      expect(result).toHaveLength(4)
    })

    it('returns at most N messages even if fewer exist', async () => {
      await repo.create(makeCreateData({ content: 'only one' }))
      const result = await repo.findRecentByPartnerId('partner-1', 10)
      expect(result).toHaveLength(1)
    })

    it('does not mix messages from different partnerIds', async () => {
      await repo.create(makeCreateData({ partnerId: 'partner-1', content: 'A' }))
      await repo.create(makeCreateData({ partnerId: 'partner-2', content: 'B' }))
      const result = await repo.findRecentByPartnerId('partner-1', 10)
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('A')
    })
  })
})
