import { describe, it, expect, vi } from 'vitest'
import { handleDuoAnswerRequest, type DuoAnswerHandlerDeps } from './handler'
import type { DuoSession } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

const TOKEN = 'tok-valid-001'
const SESSION_ID = 'session-xyz'

function makeSession(overrides: Partial<DuoSession> = {}): DuoSession {
  return {
    id: SESSION_ID,
    partnerId: 'partner-p1',
    creatorId: 'user-creator',
    sessionType: 'answer_card',
    token: TOKEN,
    questions: [
      { id: 'q1', text: 'Favorite food?' },
      { id: 'q2', text: 'Favorite place?' },
    ],
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(), // 24h from now
    partnerViewed: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeDeps(overrides: Partial<DuoAnswerHandlerDeps> = {}): DuoAnswerHandlerDeps {
  return {
    getSession: vi.fn().mockResolvedValue(makeSession()),
    updateSession: vi.fn().mockImplementation(async (_id, data) => ({
      ...makeSession(),
      ...data,
    })),
    now: new Date('2026-05-02T10:00:00.000Z'),
    ...overrides,
  }
}

const VALID_ANSWERS = { q1: 'Sushi', q2: 'Kyoto' }

// ── Tests ──────────────────────────────────────────────────────────────────

describe('handleDuoAnswerRequest', () => {
  // ── 400 Validation ────────────────────────────────────────────────────

  it('returns 400 for null body', async () => {
    const result = await handleDuoAnswerRequest(TOKEN, null, makeDeps())
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when answers is not an object', async () => {
    const result = await handleDuoAnswerRequest(TOKEN, { answers: 'string' }, makeDeps())
    expect(result.status).toBe(400)
  })

  it('returns 400 when answers is empty object', async () => {
    const result = await handleDuoAnswerRequest(TOKEN, { answers: {} }, makeDeps())
    expect(result.status).toBe(400)
  })

  it('returns 400 when answers field is missing', async () => {
    const result = await handleDuoAnswerRequest(TOKEN, {}, makeDeps())
    expect(result.status).toBe(400)
  })

  it('returns 400 body with details on validation error', async () => {
    const result = await handleDuoAnswerRequest(TOKEN, null, makeDeps())
    const body = result.body as { error: string; details: unknown }
    expect(body.details).toBeDefined()
  })

  // ── 404 Session not found ─────────────────────────────────────────────

  it('returns 404 when session not found', async () => {
    const deps = makeDeps({ getSession: vi.fn().mockResolvedValue(null) })
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(result.status).toBe(404)
    expect((result.body as { error: string }).error).toBe('Session not found')
  })

  // ── 410 Session expired ───────────────────────────────────────────────

  it('returns 410 when session is expired', async () => {
    const expiredSession = makeSession({
      expiresAt: '2020-01-01T00:00:00.000Z', // clearly in the past
    })
    const deps = makeDeps({ getSession: vi.fn().mockResolvedValue(expiredSession) })
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(result.status).toBe(410)
    expect((result.body as { error: string }).error).toBe('Session expired')
  })

  // ── 409 Already answered ──────────────────────────────────────────────

  it('returns 409 when partner already answered', async () => {
    const alreadyAnswered = makeSession({ partnerAnswers: { q1: 'Pizza' } })
    const deps = makeDeps({ getSession: vi.fn().mockResolvedValue(alreadyAnswered) })
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(result.status).toBe(409)
    expect((result.body as { error: string }).error).toBe('Already answered')
  })

  // ── 200 Success ───────────────────────────────────────────────────────

  it('returns 200 with bothAnswered: false when creator has not answered', async () => {
    // creatorAnswers is undefined → only partner answered
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, makeDeps())
    expect(result.status).toBe(200)
    const body = result.body as { bothAnswered: boolean }
    expect(body.bothAnswered).toBe(false)
  })

  it('returns 200 with bothAnswered: true when creator already answered', async () => {
    const creatorAnswered = makeSession({
      creatorAnswers: { q1: 'Ramen', q2: 'Tokyo' },
    })
    const deps = makeDeps({ getSession: vi.fn().mockResolvedValue(creatorAnswered) })
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(result.status).toBe(200)
    const body = result.body as { bothAnswered: boolean; revealedAt?: string }
    expect(body.bothAnswered).toBe(true)
  })

  it('includes revealedAt when both answered', async () => {
    const creatorAnswered = makeSession({
      creatorAnswers: { q1: 'Ramen' },
    })
    const now = new Date('2026-05-02T12:00:00.000Z')
    const updatedSession = makeSession({
      creatorAnswers: { q1: 'Ramen' },
      partnerAnswers: VALID_ANSWERS,
      revealedAt: now.toISOString(),
    })
    const deps = makeDeps({
      getSession: vi.fn().mockResolvedValue(creatorAnswered),
      updateSession: vi.fn().mockResolvedValue(updatedSession),
      now,
    })
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(result.status).toBe(200)
    const body = result.body as { bothAnswered: boolean; revealedAt?: string }
    expect(body.revealedAt).toBe(now.toISOString())
  })

  it('calls updateSession with partner answers', async () => {
    const updateSession = vi.fn().mockImplementation(async (_id, data) => ({
      ...makeSession(),
      ...data,
    }))
    const deps = makeDeps({ updateSession })
    await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(updateSession).toHaveBeenCalledOnce()
    const [id, data] = updateSession.mock.calls[0] as [string, Partial<DuoSession>]
    expect(id).toBe(SESSION_ID)
    expect(data.partnerAnswers).toEqual(VALID_ANSWERS)
  })

  it('does not set revealedAt when only partner answers (creator not yet answered)', async () => {
    const updateSession = vi.fn().mockImplementation(async (_id, data) => ({
      ...makeSession(),
      ...data,
    }))
    const deps = makeDeps({ updateSession })
    await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    const [_id, data] = updateSession.mock.calls[0] as [string, Partial<DuoSession>]
    expect(data.revealedAt).toBeUndefined()
  })

  it('uses injected now for expiry check', async () => {
    // Session expires in 1 hour from now reference
    const futureExpiry = new Date('2026-05-02T11:00:00.000Z')
    const session = makeSession({ expiresAt: futureExpiry.toISOString() })
    // now is before expiry
    const deps = makeDeps({
      getSession: vi.fn().mockResolvedValue(session),
      now: new Date('2026-05-02T10:00:00.000Z'),
    })
    const result = await handleDuoAnswerRequest(TOKEN, { answers: VALID_ANSWERS }, deps)
    expect(result.status).toBe(200)
  })

  it('non-string answer values return 400', async () => {
    const result = await handleDuoAnswerRequest(
      TOKEN,
      { answers: { q1: 123 } },
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })
})
