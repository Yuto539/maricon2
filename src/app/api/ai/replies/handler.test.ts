import { describe, it, expect, vi } from 'vitest'
import { handleRepliesRequest, type RepliesHandlerDeps } from './handler'
import { createMockProvider } from '@/lib/ai/provider'
import type { Partner } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_UUID = '0679a010-d65b-46f5-966b-e5cf9bdef988'
const USER_ID = 'user-bbb'
const TODAY = '2026-05-02'

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: VALID_UUID,
    userId: USER_ID,
    nickname: 'Sora',
    tags: [],
    status: 'active',
    bondLevel: 0,
    streakDays: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const VALID_REPLY_JSON = JSON.stringify({ reply: 'Sure, sounds great!' })

function makeDeps(overrides: Partial<RepliesHandlerDeps> = {}): RepliesHandlerDeps {
  return {
    getPartner: vi.fn().mockResolvedValue(makePartner()),
    getUsage: vi.fn().mockResolvedValue({
      userId: USER_ID,
      date: TODAY,
      aiRequestsToday: 0,
      subscriptionTier: 'free',
    }),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    aiProvider: createMockProvider(VALID_REPLY_JSON),
    today: TODAY,
    ...overrides,
  }
}

const VALID_BODY = {
  partnerId: VALID_UUID,
  latestMessage: 'How are you?',
  replyTone: 'casual' as const,
  replyType: 'expand' as const,
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('handleRepliesRequest', () => {
  // ── 400 Validation ────────────────────────────────────────────────────

  it('returns 400 for null body', async () => {
    const result = await handleRepliesRequest(null, USER_ID, makeDeps())
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when partnerId is missing', async () => {
    const { partnerId: _p, ...withoutPartnerId } = VALID_BODY
    const result = await handleRepliesRequest(withoutPartnerId, USER_ID, makeDeps())
    expect(result.status).toBe(400)
  })

  it('returns 400 when partnerId is not a UUID', async () => {
    const result = await handleRepliesRequest(
      { ...VALID_BODY, partnerId: 'bad-id' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when latestMessage is empty string', async () => {
    const result = await handleRepliesRequest(
      { ...VALID_BODY, latestMessage: '' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when latestMessage exceeds 1000 chars', async () => {
    const result = await handleRepliesRequest(
      { ...VALID_BODY, latestMessage: 'a'.repeat(1001) },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when replyTone is invalid', async () => {
    const result = await handleRepliesRequest(
      { ...VALID_BODY, replyTone: 'rude' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when replyType is invalid', async () => {
    const result = await handleRepliesRequest(
      { ...VALID_BODY, replyType: 'dodge' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 body with details field on validation error', async () => {
    const result = await handleRepliesRequest({}, USER_ID, makeDeps())
    const body = result.body as { error: string; details: unknown }
    expect(body.details).toBeDefined()
  })

  // ── 404 Partner not found ─────────────────────────────────────────────

  it('returns 404 when partner not found', async () => {
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(null) })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(404)
    expect((result.body as { error: string }).error).toBe('Partner not found')
  })

  // ── 429 Rate limit ────────────────────────────────────────────────────

  it('returns 429 when rate limit exceeded', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue({
        userId: USER_ID,
        date: TODAY,
        aiRequestsToday: 5,
        subscriptionTier: 'free',
      }),
    })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(429)
    const body = result.body as { error: string; remaining: number }
    expect(body.error).toBe('Rate limit exceeded')
    expect(body.remaining).toBe(0)
  })

  // ── 500 AI error ──────────────────────────────────────────────────────

  it('returns 500 when AI throws', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider(new Error('timeout')) })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
    expect((result.body as { error: string }).error).toBe('AI service error')
  })

  it('returns 500 when AI returns invalid JSON', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider('NOT_JSON') })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
  })

  it('returns 500 when AI returns object without reply field', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider(JSON.stringify({ text: 'hi' })) })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
  })

  it('returns 500 when AI returns empty reply string', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider(JSON.stringify({ reply: '' })) })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
  })

  // ── 200 Success ───────────────────────────────────────────────────────

  it('returns 200 with replies and remaining on success', async () => {
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, makeDeps())
    expect(result.status).toBe(200)
    const body = result.body as { replies: unknown[]; remaining: number }
    expect(body.replies).toHaveLength(1)
    expect(body.remaining).toBe(4)
  })

  it('reply item has tone and text fields', async () => {
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, makeDeps())
    const body = result.body as { replies: Array<{ tone: string; text: string }> }
    expect(body.replies[0].tone).toBe('casual')
    expect(typeof body.replies[0].text).toBe('string')
    expect(body.replies[0].text.length).toBeGreaterThan(0)
  })

  it('increments usage on success', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    await handleRepliesRequest(VALID_BODY, USER_ID, makeDeps({ incrementUsage }))
    expect(incrementUsage).toHaveBeenCalledOnce()
    expect(incrementUsage).toHaveBeenCalledWith(USER_ID, TODAY)
  })

  it('does not increment usage on partner not found', async () => {
    const incrementUsage = vi.fn()
    const deps = makeDeps({
      incrementUsage,
      getPartner: vi.fn().mockResolvedValue(null),
    })
    await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('does not increment usage on AI error', async () => {
    const incrementUsage = vi.fn()
    const deps = makeDeps({
      incrementUsage,
      aiProvider: createMockProvider(new Error('oops')),
    })
    await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('pro tier returns remaining: -1', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue({
        userId: USER_ID,
        date: TODAY,
        aiRequestsToday: 999,
        subscriptionTier: 'pro',
      }),
    })
    const result = await handleRepliesRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(200)
    expect((result.body as { remaining: number }).remaining).toBe(-1)
  })

  it('latestMessage at exactly 1000 chars is valid', async () => {
    const result = await handleRepliesRequest(
      { ...VALID_BODY, latestMessage: 'x'.repeat(1000) },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(200)
  })
})
