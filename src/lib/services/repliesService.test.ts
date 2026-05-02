import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateReplies } from './repliesService'
import type { RepliesServiceDeps } from './repliesService'
import { createMockProvider } from '@/lib/ai/provider'
import type { Partner, UsageRecord } from '@/lib/types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: 'partner-1',
    userId: 'user-1',
    nickname: 'Hana',
    tags: ['hiking'],
    status: 'active',
    bondLevel: 50,
    streakDays: 3,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeUsage(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    userId: 'user-1',
    date: '2024-01-15',
    aiRequestsToday: 0,
    subscriptionTier: 'free',
    ...overrides,
  }
}

function makeDeps(overrides: Partial<RepliesServiceDeps> = {}): RepliesServiceDeps {
  return {
    aiProvider: createMockProvider(JSON.stringify({ reply: 'That sounds fun!' })),
    getPartner: vi.fn().mockResolvedValue(makePartner()),
    getUsage: vi.fn().mockResolvedValue(makeUsage()),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const INPUT = {
  partnerId: 'partner-1',
  latestMessage: 'I went hiking today!',
  replyTone: 'casual' as const,
  replyType: 'expand' as const,
  userId: 'user-1',
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('generateReplies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── partner_not_found ──────────────────────────────────────────────────────

  it('returns partner_not_found when getPartner returns null', async () => {
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(null) })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'partner_not_found' })
  })

  it('does not call AI when partner is not found', async () => {
    const generateText = vi.fn()
    const deps = makeDeps({
      getPartner: vi.fn().mockResolvedValue(null),
      aiProvider: { generateText },
    })
    await generateReplies(INPUT, deps)
    expect(generateText).not.toHaveBeenCalled()
  })

  // ── rate_limit_exceeded ───────────────────────────────────────────────────

  it('returns rate_limit_exceeded when free tier exhausted', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue(makeUsage({ aiRequestsToday: 5 })),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'rate_limit_exceeded' })
  })

  it('allows pro tier with many requests', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue(
        makeUsage({ subscriptionTier: 'pro', aiRequestsToday: 999 }),
      ),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result.success).toBe(true)
  })

  // ── happy path ─────────────────────────────────────────────────────────────

  it('returns success with one reply entry', async () => {
    const deps = makeDeps()
    const result = await generateReplies(INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.replies).toHaveLength(1)
  })

  it('reply entry has correct tone matching input', async () => {
    const deps = makeDeps()
    const result = await generateReplies(INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.replies[0].tone).toBe('casual')
  })

  it('reply entry text matches parsed AI .reply field', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ reply: 'Wow, where did you hike?' })),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.replies[0].text).toBe('Wow, where did you hike?')
  })

  it('calls incrementUsage with userId on success', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ incrementUsage })
    await generateReplies(INPUT, deps)
    expect(incrementUsage).toHaveBeenCalledWith('user-1')
  })

  it('reflects polite tone in reply result', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ reply: 'Thank you for sharing.' })),
    })
    const result = await generateReplies({ ...INPUT, replyTone: 'polite' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.replies[0].tone).toBe('polite')
  })

  it('reflects sweet tone in reply result', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ reply: 'You are amazing!' })),
    })
    const result = await generateReplies({ ...INPUT, replyTone: 'sweet' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.replies[0].tone).toBe('sweet')
  })

  it('getPartner is called with correct partnerId and userId', async () => {
    const getPartner = vi.fn().mockResolvedValue(makePartner())
    const deps = makeDeps({ getPartner })
    await generateReplies(INPUT, deps)
    expect(getPartner).toHaveBeenCalledWith('partner-1', 'user-1')
  })

  // ── parse_error ────────────────────────────────────────────────────────────

  it('returns parse_error on invalid JSON', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider('this is not json') })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when .reply field is missing', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ message: 'wrong key' })),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when AI returns an array instead of object', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify(['item1', 'item2'])),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when .reply is empty string', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ reply: '' })),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('does not call incrementUsage on parse error', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      aiProvider: createMockProvider('bad json'),
      incrementUsage,
    })
    await generateReplies(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  // ── ai_error ───────────────────────────────────────────────────────────────

  it('returns ai_error when AI throws', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(new Error('network timeout')),
    })
    const result = await generateReplies(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'ai_error' })
  })

  it('does not call incrementUsage when AI throws', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      aiProvider: createMockProvider(new Error('fail')),
      incrementUsage,
    })
    await generateReplies(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  // ── edge cases ─────────────────────────────────────────────────────────────

  it('does not call incrementUsage when partner not found', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      getPartner: vi.fn().mockResolvedValue(null),
      incrementUsage,
    })
    await generateReplies(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('handles partner with no optional fields', async () => {
    const partner = makePartner({ tags: [], age: undefined, occupation: undefined })
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(partner) })
    const result = await generateReplies(INPUT, deps)
    expect(result.success).toBe(true)
  })

  it('handles all replyType values', async () => {
    const replyTypes = ['expand', 'close', 'question'] as const
    for (const replyType of replyTypes) {
      const deps = makeDeps()
      const result = await generateReplies({ ...INPUT, replyType }, deps)
      expect(result.success).toBe(true)
    }
  })

  it('handles latestMessage with special characters', async () => {
    const deps = makeDeps()
    const result = await generateReplies(
      { ...INPUT, latestMessage: 'Hello <script>alert("xss")</script>' },
      deps,
    )
    expect(result.success).toBe(true)
  })
})
