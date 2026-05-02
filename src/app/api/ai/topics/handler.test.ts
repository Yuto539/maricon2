import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleTopicsRequest, type TopicsHandlerDeps } from './handler'
import { InMemoryPartnerRepository } from '@/lib/repositories/memory/InMemoryPartnerRepository'
import { InMemoryUsageRepository } from '@/lib/repositories/memory/InMemoryUsageRepository'
import { InMemoryMessageRepository } from '@/lib/repositories/memory/InMemoryMessageRepository'
import { createMockProvider } from '@/lib/ai/provider'
import type { Partner } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_UUID = '8f2e012d-171d-4637-962b-a2eef30a7b34'
const USER_ID = 'user-aaa'
const TODAY = '2026-05-02'

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: VALID_UUID,
    userId: USER_ID,
    nickname: 'Hana',
    tags: [],
    status: 'active',
    bondLevel: 0,
    streakDays: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const VALID_TOPICS_JSON = JSON.stringify([
  { text: 'Topic A', category: 'daily', depth: 'light' },
  { text: 'Topic B', category: 'hobby', depth: 'medium' },
])

function makeDeps(overrides: Partial<TopicsHandlerDeps> = {}): TopicsHandlerDeps {
  return {
    getPartner: vi.fn().mockResolvedValue(makePartner()),
    getRecentMessages: vi.fn().mockResolvedValue([]),
    getUsage: vi.fn().mockResolvedValue({
      userId: USER_ID,
      date: TODAY,
      aiRequestsToday: 0,
      subscriptionTier: 'free',
    }),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    aiProvider: createMockProvider(VALID_TOPICS_JSON),
    today: TODAY,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('handleTopicsRequest', () => {
  // ── 400 Validation ────────────────────────────────────────────────────

  it('returns 400 when body is null', async () => {
    const result = await handleTopicsRequest(null, USER_ID, makeDeps())
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when partnerId is missing', async () => {
    const result = await handleTopicsRequest({ sceneType: 'morning' }, USER_ID, makeDeps())
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when partnerId is not a UUID', async () => {
    const result = await handleTopicsRequest(
      { partnerId: 'not-a-uuid', sceneType: 'morning' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when sceneType is invalid', async () => {
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'lunch' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 body with details field on validation error', async () => {
    const result = await handleTopicsRequest({}, USER_ID, makeDeps())
    expect(result.status).toBe(400)
    const body = result.body as { error: string; details: unknown }
    expect(body.details).toBeDefined()
  })

  // ── 404 Partner not found ─────────────────────────────────────────────

  it('returns 404 when partner is not found', async () => {
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(null) })
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      deps,
    )
    expect(result.status).toBe(404)
    expect((result.body as { error: string }).error).toBe('Partner not found')
  })

  // ── 429 Rate limit ────────────────────────────────────────────────────

  it('returns 429 when rate limit is exceeded', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue({
        userId: USER_ID,
        date: TODAY,
        aiRequestsToday: 5,
        subscriptionTier: 'free',
      }),
    })
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      deps,
    )
    expect(result.status).toBe(429)
    const body = result.body as { error: string; remaining: number }
    expect(body.error).toBe('Rate limit exceeded')
    expect(body.remaining).toBe(0)
  })

  // ── 500 AI error ──────────────────────────────────────────────────────

  it('returns 500 when AI throws', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(new Error('AI down')),
    })
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      deps,
    )
    expect(result.status).toBe(500)
    expect((result.body as { error: string }).error).toBe('AI service error')
  })

  it('returns 500 when AI returns invalid JSON', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider('not json at all'),
    })
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      deps,
    )
    expect(result.status).toBe(500)
    expect((result.body as { error: string }).error).toBe('AI service error')
  })

  it('returns 500 when AI returns empty array', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider('[]'),
    })
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      deps,
    )
    expect(result.status).toBe(500)
    expect((result.body as { error: string }).error).toBe('AI service error')
  })

  // ── 200 Success ───────────────────────────────────────────────────────

  it('returns 200 with topics and remaining count on success', async () => {
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'morning' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(200)
    const body = result.body as { topics: unknown[]; remaining: number }
    expect(body.topics).toHaveLength(2)
    expect(body.remaining).toBe(4) // 5 limit - 0 used - 1 just consumed = 4
  })

  it('increments usage on success', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ incrementUsage })
    await handleTopicsRequest({ partnerId: VALID_UUID, sceneType: 'general' }, USER_ID, deps)
    expect(incrementUsage).toHaveBeenCalledOnce()
    expect(incrementUsage).toHaveBeenCalledWith(USER_ID, TODAY)
  })

  it('uses default sceneType "general" when not provided', async () => {
    const getRecentMessages = vi.fn().mockResolvedValue([])
    const deps = makeDeps({ getRecentMessages })
    const result = await handleTopicsRequest({ partnerId: VALID_UUID }, USER_ID, deps)
    expect(result.status).toBe(200)
  })

  it('does NOT increment usage on rate limit exceeded', async () => {
    const incrementUsage = vi.fn()
    const deps = makeDeps({
      incrementUsage,
      getUsage: vi.fn().mockResolvedValue({
        userId: USER_ID,
        date: TODAY,
        aiRequestsToday: 5,
        subscriptionTier: 'free',
      }),
    })
    await handleTopicsRequest({ partnerId: VALID_UUID, sceneType: 'general' }, USER_ID, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('does NOT increment usage on AI error', async () => {
    const incrementUsage = vi.fn()
    const deps = makeDeps({
      incrementUsage,
      aiProvider: createMockProvider(new Error('AI down')),
    })
    await handleTopicsRequest({ partnerId: VALID_UUID, sceneType: 'general' }, USER_ID, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('pro tier user gets remaining: -1 (unlimited)', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue({
        userId: USER_ID,
        date: TODAY,
        aiRequestsToday: 100,
        subscriptionTier: 'pro',
      }),
    })
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      deps,
    )
    expect(result.status).toBe(200)
    const body = result.body as { remaining: number }
    expect(body.remaining).toBe(-1)
  })

  it('passes today to incrementUsage', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ incrementUsage, today: '2026-03-15' })
    await handleTopicsRequest({ partnerId: VALID_UUID, sceneType: 'general' }, USER_ID, deps)
    expect(incrementUsage).toHaveBeenCalledWith(USER_ID, '2026-03-15')
  })

  it('each returned topic has id, text, category, depth', async () => {
    const result = await handleTopicsRequest(
      { partnerId: VALID_UUID, sceneType: 'general' },
      USER_ID,
      makeDeps(),
    )
    const body = result.body as { topics: Array<Record<string, unknown>> }
    for (const topic of body.topics) {
      expect(typeof topic.id).toBe('string')
      expect(typeof topic.text).toBe('string')
      expect(typeof topic.category).toBe('string')
      expect(['light', 'medium', 'deep']).toContain(topic.depth)
    }
  })
})
