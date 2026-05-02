import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reviewMessage } from './reviewService'
import type { ReviewServiceDeps } from './reviewService'
import { createMockProvider } from '@/lib/ai/provider'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeAIResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    score: 80,
    tone: 'balanced',
    aiIssues: [],
    suggestion: 'Looks good!',
    ...overrides,
  })
}

function makeDeps(overrides: Partial<ReviewServiceDeps> = {}): ReviewServiceDeps {
  return {
    aiProvider: createMockProvider(makeAIResponse()),
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('reviewMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── happy path ─────────────────────────────────────────────────────────────

  it('returns success with review result for normal text', async () => {
    const deps = makeDeps()
    const result = await reviewMessage({ text: 'How was your day today?' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.score).toBe(80)
    expect(result.review.tone).toBe('balanced')
    expect(result.review.suggestion).toBe('Looks good!')
  })

  it('merges local issues with AI issues', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(
        makeAIResponse({
          aiIssues: [
            { type: 'landmine_word', message: 'Avoid this word', severity: 'warning' },
          ],
        }),
      ),
    })
    // Text is also too long (>200 chars) to get a local issue
    const longText = 'a'.repeat(201)
    const result = await reviewMessage({ text: longText }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const types = result.review.issues.map((i) => i.type)
    expect(types).toContain('too_long')
    expect(types).toContain('landmine_word')
  })

  // ── local rules: too_long ──────────────────────────────────────────────────

  it('adds too_long warning when text exceeds 200 characters', async () => {
    const deps = makeDeps()
    const longText = 'a'.repeat(201)
    const result = await reviewMessage({ text: longText }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const issue = result.review.issues.find((i) => i.type === 'too_long')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('warning')
  })

  it('does not add too_long when text is exactly 200 characters', async () => {
    const deps = makeDeps()
    const text = 'a'.repeat(200)
    const result = await reviewMessage({ text }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues.find((i) => i.type === 'too_long')).toBeUndefined()
  })

  it('does not add too_long for normal-length text', async () => {
    const deps = makeDeps()
    const result = await reviewMessage({ text: 'Hello there!' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues.find((i) => i.type === 'too_long')).toBeUndefined()
  })

  // ── local rules: too_short ─────────────────────────────────────────────────

  it('adds too_short warning when text is fewer than 5 characters', async () => {
    const deps = makeDeps()
    const result = await reviewMessage({ text: 'Hi' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const issue = result.review.issues.find((i) => i.type === 'too_short')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('warning')
  })

  it('does not add too_short when text is exactly 5 characters', async () => {
    const deps = makeDeps()
    const result = await reviewMessage({ text: 'Hello' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues.find((i) => i.type === 'too_short')).toBeUndefined()
  })

  it('does not add too_short for empty string', async () => {
    // empty string is 0 chars, <5, should still get too_short
    const deps = makeDeps()
    const result = await reviewMessage({ text: '' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const issue = result.review.issues.find((i) => i.type === 'too_short')
    expect(issue).toBeDefined()
  })

  it('does not add too_short for text of length 4', async () => {
    const deps = makeDeps()
    const result = await reviewMessage({ text: 'Okay' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const issue = result.review.issues.find((i) => i.type === 'too_short')
    expect(issue).toBeDefined()
  })

  // ── local rules: emoji_overuse ─────────────────────────────────────────────

  it('adds emoji_overuse warning when more than 3 emojis present', async () => {
    const deps = makeDeps()
    // 4 emoji characters
    const result = await reviewMessage({ text: 'Hello there friend' }, deps)
    // No emojis in that text, let's use actual emoji
    const textWithEmojis = 'Hi ❤️❤️❤️❤️ how are you'
    const result2 = await reviewMessage({ text: textWithEmojis }, deps)
    expect(result2.success).toBe(true)
    if (!result2.success) return
    const issue = result2.review.issues.find((i) => i.type === 'emoji_overuse')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('warning')
  })

  it('does not add emoji_overuse for exactly 3 emojis', async () => {
    const deps = makeDeps()
    const textWith3Emojis = 'Hi ❤️❤️❤️ nice!'
    const result = await reviewMessage({ text: textWith3Emojis }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues.find((i) => i.type === 'emoji_overuse')).toBeUndefined()
  })

  it('does not add emoji_overuse for text with no emojis', async () => {
    const deps = makeDeps()
    const result = await reviewMessage({ text: 'Plain text, no emojis here.' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues.find((i) => i.type === 'emoji_overuse')).toBeUndefined()
  })

  // ── ai-delegated issues ────────────────────────────────────────────────────

  it('includes AI-provided landmine_word issues', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(
        makeAIResponse({
          aiIssues: [
            { type: 'landmine_word', message: 'Dangerous word detected', severity: 'error' },
          ],
        }),
      ),
    })
    const result = await reviewMessage({ text: 'Some normal text here.' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const issue = result.review.issues.find((i) => i.type === 'landmine_word')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('error')
  })

  it('includes AI-provided self_centered issues', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(
        makeAIResponse({
          aiIssues: [
            { type: 'self_centered', message: 'Talks only about self', severity: 'warning' },
          ],
        }),
      ),
    })
    const result = await reviewMessage({ text: 'I did this, I did that.' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues.find((i) => i.type === 'self_centered')).toBeDefined()
  })

  it('tone field in result matches AI response tone', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(makeAIResponse({ tone: 'too_heavy' })),
    })
    const result = await reviewMessage({ text: 'Normal text here.' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.tone).toBe('too_heavy')
  })

  it('no issues when text is clean and AI returns empty aiIssues', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(makeAIResponse({ aiIssues: [] })),
    })
    const result = await reviewMessage({ text: 'That sounds really fun!' }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.review.issues).toHaveLength(0)
  })

  // ── parse_error ────────────────────────────────────────────────────────────

  it('returns parse_error on invalid JSON from AI', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider('not json') })
    const result = await reviewMessage({ text: 'Hello' }, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when AI response is missing required fields', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(JSON.stringify({ score: 80 })),
    })
    const result = await reviewMessage({ text: 'Hello there!' }, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  it('returns parse_error when score is not a number', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(
        JSON.stringify({ score: 'high', tone: 'balanced', aiIssues: [], suggestion: 'ok' }),
      ),
    })
    const result = await reviewMessage({ text: 'Hello!' }, deps)
    expect(result).toEqual({ success: false, error: 'parse_error' })
  })

  // ── ai_error ───────────────────────────────────────────────────────────────

  it('returns ai_error when AI throws', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(new Error('AI service down')),
    })
    const result = await reviewMessage({ text: 'Hello!' }, deps)
    expect(result).toEqual({ success: false, error: 'ai_error' })
  })

  // ── both local and AI issues present ──────────────────────────────────────

  it('combines multiple local issues for a single message', async () => {
    const deps = makeDeps({
      aiProvider: createMockProvider(makeAIResponse({ aiIssues: [] })),
    })
    // 4 bare-heart emojis: length=4 (<5) AND emoji count=4 (>3)
    const text = '❤❤❤❤'
    const result = await reviewMessage({ text }, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const types = result.review.issues.map((i) => i.type)
    expect(types).toContain('too_short')
    expect(types).toContain('emoji_overuse')
  })
})
