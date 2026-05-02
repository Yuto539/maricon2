import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTopics } from './topicsService'
import type { TopicsServiceDeps } from './topicsService'
import { createMockProvider } from '@/lib/ai/provider'
import type { Partner, Message, UsageRecord } from '@/lib/types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: 'partner-1',
    userId: 'user-1',
    nickname: 'Hana',
    tags: ['hiking', 'cooking'],
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

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    partnerId: 'partner-1',
    sender: 'me',
    content: 'Hello!',
    sentAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

function makeDeps(overrides: Partial<TopicsServiceDeps> = {}): TopicsServiceDeps {
  return {
    aiProvider: createMockProvider(
      JSON.stringify([
        { text: 'Let us talk about hiking', category: 'hobby', depth: 'light' },
        { text: 'What do you cook?', category: 'lifestyle', depth: 'medium' },
        { text: 'Future travel dreams', category: 'future', depth: 'deep' },
      ]),
    ),
    getPartner: vi.fn().mockResolvedValue(makePartner()),
    getRecentMessages: vi.fn().mockResolvedValue([]),
    getUsage: vi.fn().mockResolvedValue(makeUsage()),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const INPUT = { partnerId: 'partner-1', sceneType: 'morning' as const, userId: 'user-1' }

// ── Tests ────────────────────────────────────────────────────────────────────

describe('generateTopics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── partner_not_found ──────────────────────────────────────────────────────

  it('returns partner_not_found when getPartner returns null', async () => {
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(null) })
    const result = await generateTopics(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'partner_not_found' })
  })

  it('does not call AI when partner is not found', async () => {
    const generateText = vi.fn()
    const deps = makeDeps({
      getPartner: vi.fn().mockResolvedValue(null),
      aiProvider: { generateText },
    })
    await generateTopics(INPUT, deps)
    expect(generateText).not.toHaveBeenCalled()
  })

  // ── rate_limit_exceeded ───────────────────────────────────────────────────

  it('returns rate_limit_exceeded when free tier limit is reached', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue(makeUsage({ aiRequestsToday: 5 })),
    })
    const result = await generateTopics(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'rate_limit_exceeded' })
  })

  it('does not call AI when rate limit is exceeded', async () => {
    const generateText = vi.fn()
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue(makeUsage({ aiRequestsToday: 5 })),
      aiProvider: { generateText },
    })
    await generateTopics(INPUT, deps)
    expect(generateText).not.toHaveBeenCalled()
  })

  it('allows request when pro tier has made many requests', async () => {
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue(
        makeUsage({ subscriptionTier: 'pro', aiRequestsToday: 100 }),
      ),
    })
    const result = await generateTopics(INPUT, deps)
    expect(result.success).toBe(true)
  })

  // ── happy path ─────────────────────────────────────────────────────────────

  it('returns success with 3 topics on valid response', async () => {
    const deps = makeDeps()
    const result = await generateTopics(INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.topics).toHaveLength(3)
  })

  it('each topic has id, text, category, depth', async () => {
    const deps = makeDeps()
    const result = await generateTopics(INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    for (const topic of result.topics) {
      expect(topic.id).toBeTruthy()
      expect(typeof topic.id).toBe('string')
      expect(topic.text).toBeTruthy()
      expect(topic.category).toBeTruthy()
      expect(['light', 'medium', 'deep']).toContain(topic.depth)
    }
  })

  it('each topic receives a unique id', async () => {
    const deps = makeDeps()
    const result = await generateTopics(INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const ids = result.topics.map((t) => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('calls incrementUsage on success', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({ incrementUsage })
    await generateTopics(INPUT, deps)
    expect(incrementUsage).toHaveBeenCalledWith('user-1')
  })

  it('does not call incrementUsage when partner not found', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      getPartner: vi.fn().mockResolvedValue(null),
      incrementUsage,
    })
    await generateTopics(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('does not call incrementUsage when rate limited', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      getUsage: vi.fn().mockResolvedValue(makeUsage({ aiRequestsToday: 5 })),
      incrementUsage,
    })
    await generateTopics(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  it('calls getRecentMessages with partnerId and a positive limit', async () => {
    const getRecentMessages = vi.fn().mockResolvedValue([])
    const deps = makeDeps({ getRecentMessages })
    await generateTopics(INPUT, deps)
    expect(getRecentMessages).toHaveBeenCalledWith('partner-1', expect.any(Number))
    const limit: number = (getRecentMessages as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(limit).toBeGreaterThan(0)
  })

  it('passes recent messages to AI prompt', async () => {
    const generateText = vi.fn().mockResolvedValue(
      JSON.stringify([
        { text: 'topic', category: 'hobby', depth: 'light' as const },
      ]),
    )
    const recentMessages: Message[] = [makeMessage({ content: 'Had a great hike!' })]
    const deps = makeDeps({
      aiProvider: { generateText },
      getRecentMessages: vi.fn().mockResolvedValue(recentMessages),
    })
    await generateTopics(INPUT, deps)
    const userPrompt: string = generateText.mock.calls[0][0]
    expect(userPrompt).toContain('Had a great hike!')
  })

  // ── parse_error ────────────────────────────────────────────────────────────

  it('returns parse_error when AI responds with invalid JSON', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider('not valid json at all') })
    const result = await generateTopics(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when AI responds with JSON object instead of array', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ reply: 'oops' })),
    })
    const result = await generateTopics(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when AI responds with empty array', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider('[]') })
    const result = await generateTopics(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('does not call incrementUsage on parse error', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      aiProvider: createMockProvider('bad json'),
      incrementUsage,
    })
    await generateTopics(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  // ── ai_error ───────────────────────────────────────────────────────────────

  it('returns ai_error when AI throws', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(new Error('OpenAI timeout')),
    })
    const result = await generateTopics(INPUT, deps)
    expect(result).toEqual({ success: false, error: 'ai_error' })
  })

  it('does not call incrementUsage when AI throws', async () => {
    const incrementUsage = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      aiProvider: createMockProvider(new Error('fail')),
      incrementUsage,
    })
    await generateTopics(INPUT, deps)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  // ── edge cases ─────────────────────────────────────────────────────────────

  it('handles partner with no tags or optional fields', async () => {
    const minimalPartner = makePartner({ tags: [], age: undefined, occupation: undefined })
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(minimalPartner) })
    const result = await generateTopics(INPUT, deps)
    expect(result.success).toBe(true)
  })

  it('handles all sceneType values', async () => {
    const sceneTypes = ['morning', 'evening', 'weekend', 'after_date', 'general'] as const
    for (const sceneType of sceneTypes) {
      const deps = makeDeps()
      const result = await generateTopics({ ...INPUT, sceneType }, deps)
      expect(result.success).toBe(true)
    }
  })

  it('getPartner is called with correct partnerId and userId', async () => {
    const getPartner = vi.fn().mockResolvedValue(makePartner())
    const deps = makeDeps({ getPartner })
    await generateTopics(INPUT, deps)
    expect(getPartner).toHaveBeenCalledWith('partner-1', 'user-1')
  })
})
