import { describe, it, expect, vi } from 'vitest'
import { handleReviewRequest, type ReviewHandlerDeps } from './handler'
import { createMockProvider } from '@/lib/ai/provider'
import type { Partner } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_UUID = '35b33db3-7b42-46d9-bd4f-62e687f293e3'
const USER_ID = 'user-ccc'

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: VALID_UUID,
    userId: USER_ID,
    nickname: 'Kei',
    tags: [],
    status: 'active',
    bondLevel: 0,
    streakDays: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const VALID_AI_REVIEW = JSON.stringify({
  score: 80,
  tone: 'balanced',
  aiIssues: [],
  suggestion: 'Looks great!',
})

function makeDeps(overrides: Partial<ReviewHandlerDeps> = {}): ReviewHandlerDeps {
  return {
    getPartner: vi.fn().mockResolvedValue(makePartner()),
    aiProvider: createMockProvider(VALID_AI_REVIEW),
    ...overrides,
  }
}

const VALID_BODY = {
  text: 'Hello, how are you doing today?',
  partnerId: VALID_UUID,
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('handleReviewRequest', () => {
  // ── 400 Validation ────────────────────────────────────────────────────

  it('returns 400 for null body', async () => {
    const result = await handleReviewRequest(null, USER_ID, makeDeps())
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when text is missing', async () => {
    const result = await handleReviewRequest({ partnerId: VALID_UUID }, USER_ID, makeDeps())
    expect(result.status).toBe(400)
  })

  it('returns 400 when text is empty string', async () => {
    const result = await handleReviewRequest(
      { ...VALID_BODY, text: '' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when text exceeds 500 chars', async () => {
    const result = await handleReviewRequest(
      { ...VALID_BODY, text: 'a'.repeat(501) },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when partnerId is not a UUID', async () => {
    const result = await handleReviewRequest(
      { ...VALID_BODY, partnerId: 'not-uuid' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when partnerId is missing', async () => {
    const result = await handleReviewRequest({ text: 'Hello' }, USER_ID, makeDeps())
    expect(result.status).toBe(400)
  })

  it('returns 400 body with details on validation error', async () => {
    const result = await handleReviewRequest({}, USER_ID, makeDeps())
    const body = result.body as { error: string; details: unknown }
    expect(body.details).toBeDefined()
  })

  // ── 404 Partner not found ─────────────────────────────────────────────

  it('returns 404 when partner not found', async () => {
    const deps = makeDeps({ getPartner: vi.fn().mockResolvedValue(null) })
    const result = await handleReviewRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(404)
    expect((result.body as { error: string }).error).toBe('Partner not found')
  })

  // ── 500 AI error ──────────────────────────────────────────────────────

  it('returns 500 when AI throws', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider(new Error('AI down')) })
    const result = await handleReviewRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
    expect((result.body as { error: string }).error).toBe('AI service error')
  })

  it('returns 500 when AI returns invalid JSON', async () => {
    const deps = makeDeps({ aiProvider: createMockProvider('GARBAGE') })
    const result = await handleReviewRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
  })

  it('returns 500 when AI response is missing score field', async () => {
    const bad = JSON.stringify({ tone: 'balanced', aiIssues: [], suggestion: 'ok' })
    const deps = makeDeps({ aiProvider: createMockProvider(bad) })
    const result = await handleReviewRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(500)
  })

  // ── 200 Success ───────────────────────────────────────────────────────

  it('returns 200 with review on success', async () => {
    const result = await handleReviewRequest(VALID_BODY, USER_ID, makeDeps())
    expect(result.status).toBe(200)
    const body = result.body as { review: Record<string, unknown> }
    expect(body.review).toBeDefined()
  })

  it('review result has score, tone, issues, suggestion', async () => {
    const result = await handleReviewRequest(VALID_BODY, USER_ID, makeDeps())
    const { review } = result.body as {
      review: { score: number; tone: string; issues: unknown[]; suggestion: string }
    }
    expect(typeof review.score).toBe('number')
    expect(typeof review.tone).toBe('string')
    expect(Array.isArray(review.issues)).toBe(true)
    expect(typeof review.suggestion).toBe('string')
  })

  it('does NOT consume rate limit (no usage tracking)', async () => {
    // Review handler deps have no getUsage/incrementUsage — confirm it compiles
    // and succeeds without those deps
    const deps = makeDeps()
    // Ensure deps does NOT have getUsage or incrementUsage keys
    expect('getUsage' in deps).toBe(false)
    expect('incrementUsage' in deps).toBe(false)
    const result = await handleReviewRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(200)
  })

  it('text at exactly 500 chars is valid', async () => {
    const result = await handleReviewRequest(
      { ...VALID_BODY, text: 'a'.repeat(500) },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(200)
  })

  it('appends local issues for too-long text to review issues', async () => {
    const longText = 'a'.repeat(201)
    const result = await handleReviewRequest(
      { ...VALID_BODY, text: longText },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(200)
    const { review } = result.body as { review: { issues: Array<{ type: string }> } }
    expect(review.issues.some((i) => i.type === 'too_long')).toBe(true)
  })
})
