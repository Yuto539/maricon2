import { describe, it, expect, vi } from 'vitest'
import { handleDuoCreateRequest, type DuoCreateHandlerDeps } from './handler'
import type { DuoSession, NewDuoSession } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_UUID = 'ccbad85f-173e-40b6-8931-3fedb548a960'
const USER_ID = 'user-ddd'
const BASE_URL = 'https://app.example.com'

function makeSession(overrides: Partial<DuoSession> = {}): DuoSession {
  return {
    id: 'session-001',
    partnerId: VALID_UUID,
    creatorId: USER_ID,
    sessionType: 'answer_card',
    token: 'tok-abc123',
    questions: [{ id: 'q1', text: 'Favorite food?' }],
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    partnerViewed: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeDeps(overrides: Partial<DuoCreateHandlerDeps> = {}): DuoCreateHandlerDeps {
  return {
    createSession: vi.fn().mockResolvedValue(makeSession()),
    canUseDuoCheck: vi.fn().mockResolvedValue(true),
    baseUrl: BASE_URL,
    ...overrides,
  }
}

const VALID_BODY = {
  partnerId: VALID_UUID,
  sessionType: 'answer_card' as const,
  questions: [
    { id: 'q1', text: 'What is your favorite food?' },
    { id: 'q2', text: 'Where do you want to travel?', options: ['Japan', 'Italy'] },
  ],
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('handleDuoCreateRequest', () => {
  // ── 400 Validation ────────────────────────────────────────────────────

  it('returns 400 for null body', async () => {
    const result = await handleDuoCreateRequest(null, USER_ID, makeDeps())
    expect(result.status).toBe(400)
    expect((result.body as { error: string }).error).toBe('Invalid request')
  })

  it('returns 400 when partnerId is not a UUID', async () => {
    const result = await handleDuoCreateRequest(
      { ...VALID_BODY, partnerId: 'bad' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when sessionType is invalid', async () => {
    const result = await handleDuoCreateRequest(
      { ...VALID_BODY, sessionType: 'unknown' },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when questions array is empty', async () => {
    const result = await handleDuoCreateRequest(
      { ...VALID_BODY, questions: [] },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when questions exceed 20', async () => {
    const questions = Array.from({ length: 21 }, (_, i) => ({ id: `q${i}`, text: `Q${i}` }))
    const result = await handleDuoCreateRequest(
      { ...VALID_BODY, questions },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 when a question has empty text', async () => {
    const result = await handleDuoCreateRequest(
      { ...VALID_BODY, questions: [{ id: 'q1', text: '' }] },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(400)
  })

  it('returns 400 body with details on validation error', async () => {
    const result = await handleDuoCreateRequest({}, USER_ID, makeDeps())
    const body = result.body as { error: string; details: unknown }
    expect(body.details).toBeDefined()
  })

  // ── 403 Subscription required ─────────────────────────────────────────

  it('returns 403 when canUseDuoCheck returns false', async () => {
    const deps = makeDeps({ canUseDuoCheck: vi.fn().mockResolvedValue(false) })
    const result = await handleDuoCreateRequest(VALID_BODY, USER_ID, deps)
    expect(result.status).toBe(403)
    expect((result.body as { error: string }).error).toBe('Subscription required')
  })

  // ── 200 Success ───────────────────────────────────────────────────────

  it('returns 200 with sessionId, shareUrl, expiresAt on success', async () => {
    const result = await handleDuoCreateRequest(VALID_BODY, USER_ID, makeDeps())
    expect(result.status).toBe(200)
    const body = result.body as { sessionId: string; shareUrl: string; expiresAt: string }
    expect(typeof body.sessionId).toBe('string')
    expect(typeof body.shareUrl).toBe('string')
    expect(typeof body.expiresAt).toBe('string')
  })

  it('shareUrl contains the token that was passed to createSession', async () => {
    let capturedToken = ''
    const createSession = vi.fn().mockImplementation(async (data: NewDuoSession) => {
      capturedToken = data.token
      return makeSession({ token: data.token })
    })
    const deps = makeDeps({ createSession })
    const result = await handleDuoCreateRequest(VALID_BODY, USER_ID, deps)
    const body = result.body as { shareUrl: string }
    expect(capturedToken).not.toBe('')
    expect(body.shareUrl).toContain(capturedToken)
  })

  it('shareUrl is built from baseUrl', async () => {
    const result = await handleDuoCreateRequest(VALID_BODY, USER_ID, makeDeps())
    const body = result.body as { shareUrl: string }
    expect(body.shareUrl).toContain(BASE_URL)
  })

  it('passes correct data to createSession', async () => {
    const createSession = vi.fn().mockResolvedValue(makeSession())
    const deps = makeDeps({ createSession })
    await handleDuoCreateRequest(VALID_BODY, USER_ID, deps)
    expect(createSession).toHaveBeenCalledOnce()
    const arg = createSession.mock.calls[0][0] as NewDuoSession
    expect(arg.partnerId).toBe(VALID_UUID)
    expect(arg.creatorId).toBe(USER_ID)
    expect(arg.sessionType).toBe('answer_card')
    expect(arg.questions).toHaveLength(2)
  })

  it('20 questions (max boundary) is valid', async () => {
    const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, text: `Q${i}` }))
    const result = await handleDuoCreateRequest(
      { ...VALID_BODY, questions },
      USER_ID,
      makeDeps(),
    )
    expect(result.status).toBe(200)
  })

  it('all session types are accepted', async () => {
    for (const sessionType of ['answer_card', 'quiz', 'date_plan'] as const) {
      const result = await handleDuoCreateRequest(
        { ...VALID_BODY, sessionType },
        USER_ID,
        makeDeps(),
      )
      expect(result.status).toBe(200)
    }
  })
})
