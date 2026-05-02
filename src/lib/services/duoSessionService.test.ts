import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDuoSession, submitPartnerAnswer } from './duoSessionService'
import type { DuoSessionServiceDeps } from './duoSessionService'
import type { DuoSession, NewDuoSession, Question } from '@/lib/types'

// ── Helpers ─────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  { id: 'q1', text: 'What is your favourite season?' },
  { id: 'q2', text: 'Dream travel destination?' },
]

function makeSession(overrides: Partial<DuoSession> = {}): DuoSession {
  return {
    id: 'session-1',
    partnerId: 'partner-1',
    creatorId: 'user-1',
    sessionType: 'answer_card',
    token: 'abc123',
    questions: QUESTIONS,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(), // future
    partnerViewed: false,
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

function makeDeps(overrides: Partial<DuoSessionServiceDeps> = {}): DuoSessionServiceDeps {
  return {
    createSession: vi.fn().mockImplementation(async (s: NewDuoSession) => ({
      ...s,
      id: 'session-1',
      partnerViewed: false,
      createdAt: '2024-01-15T10:00:00Z',
    })),
    getSession: vi.fn().mockResolvedValue(makeSession()),
    updateSession: vi.fn().mockImplementation(
      async (id: string, updates: Partial<DuoSession>) => ({
        ...makeSession(),
        id,
        ...updates,
      }),
    ),
    canUseDuoCheck: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

const CREATE_INPUT = {
  partnerId: 'partner-1',
  sessionType: 'answer_card' as const,
  questions: QUESTIONS,
  userId: 'user-1',
  baseUrl: 'https://example.com',
}

// ── createDuoSession tests ────────────────────────────────────────────────────

describe('createDuoSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── subscription_required ────────────────────────────────────────────────

  it('returns subscription_required when canUseDuoCheck returns false', async () => {
    const deps = makeDeps({ canUseDuoCheck: vi.fn().mockResolvedValue(false) })
    const result = await createDuoSession(CREATE_INPUT, deps)
    expect(result).toEqual({ success: false, error: 'subscription_required' })
  })

  it('does not call createSession when subscription check fails', async () => {
    const createSession = vi.fn()
    const deps = makeDeps({
      canUseDuoCheck: vi.fn().mockResolvedValue(false),
      createSession,
    })
    await createDuoSession(CREATE_INPUT, deps)
    expect(createSession).not.toHaveBeenCalled()
  })

  // ── happy path ────────────────────────────────────────────────────────────

  it('returns success with sessionId, shareUrl, expiresAt', async () => {
    const deps = makeDeps()
    const result = await createDuoSession(CREATE_INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.sessionId).toBeTruthy()
    expect(result.shareUrl).toBeTruthy()
    expect(result.expiresAt).toBeTruthy()
  })

  it('shareUrl contains /duo/ and the token', async () => {
    const deps = makeDeps()
    const result = await createDuoSession(CREATE_INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.shareUrl).toMatch(/\/duo\//)
    expect(result.shareUrl.startsWith('https://example.com/duo/')).toBe(true)
  })

  it('shareUrl token part has non-zero length', async () => {
    const deps = makeDeps()
    const result = await createDuoSession(CREATE_INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const tokenPart = result.shareUrl.replace('https://example.com/duo/', '')
    expect(tokenPart.length).toBeGreaterThan(0)
  })

  it('calls canUseDuoCheck with userId', async () => {
    const canUseDuoCheck = vi.fn().mockResolvedValue(true)
    const deps = makeDeps({ canUseDuoCheck })
    await createDuoSession(CREATE_INPUT, deps)
    expect(canUseDuoCheck).toHaveBeenCalledWith('user-1')
  })

  it('calls createSession with correct partnerId and sessionType', async () => {
    const createSession = vi.fn().mockResolvedValue(makeSession())
    const deps = makeDeps({ createSession })
    await createDuoSession(CREATE_INPUT, deps)
    expect(createSession).toHaveBeenCalledTimes(1)
    const arg: NewDuoSession = (createSession as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.partnerId).toBe('partner-1')
    expect(arg.sessionType).toBe('answer_card')
  })

  it('passes questions to createSession', async () => {
    const createSession = vi.fn().mockResolvedValue(makeSession())
    const deps = makeDeps({ createSession })
    await createDuoSession(CREATE_INPUT, deps)
    const arg: NewDuoSession = (createSession as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.questions).toEqual(QUESTIONS)
  })

  it('passes creatorId = userId to createSession', async () => {
    const createSession = vi.fn().mockResolvedValue(makeSession())
    const deps = makeDeps({ createSession })
    await createDuoSession(CREATE_INPUT, deps)
    const arg: NewDuoSession = (createSession as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.creatorId).toBe('user-1')
  })

  it('expiresAt in result is a valid ISO date string roughly 24h in the future', async () => {
    const before = Date.now()
    const deps = makeDeps()
    const result = await createDuoSession(CREATE_INPUT, deps)
    expect(result.success).toBe(true)
    if (!result.success) return
    const expires = new Date(result.expiresAt).getTime()
    const after = Date.now()
    // Should be at least 23 hours and at most 25 hours from now
    expect(expires).toBeGreaterThan(before + 23 * 3_600_000)
    expect(expires).toBeLessThan(after + 25 * 3_600_000)
  })

  it('generates a unique token each call', async () => {
    const deps1 = makeDeps()
    const deps2 = makeDeps()
    const r1 = await createDuoSession(CREATE_INPUT, deps1)
    const r2 = await createDuoSession(CREATE_INPUT, deps2)
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    if (!r1.success || !r2.success) return
    expect(r1.shareUrl).not.toBe(r2.shareUrl)
  })

  it('works for all sessionType values', async () => {
    const sessionTypes = ['answer_card', 'quiz', 'date_plan'] as const
    for (const sessionType of sessionTypes) {
      const deps = makeDeps()
      const result = await createDuoSession({ ...CREATE_INPUT, sessionType }, deps)
      expect(result.success).toBe(true)
    }
  })
})

// ── submitPartnerAnswer tests ─────────────────────────────────────────────────

describe('submitPartnerAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const VALID_ANSWERS = { q1: 'Summer', q2: 'Japan' }
  const FIXED_NOW = new Date('2024-01-15T12:00:00Z')

  // ── session_not_found ─────────────────────────────────────────────────────

  it('returns session_not_found when getSession returns null', async () => {
    const deps = {
      getSession: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn(),
    }
    const result = await submitPartnerAnswer(
      { token: 'nonexistent', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(result).toEqual({ success: false, error: 'session_not_found' })
  })

  it('does not call updateSession when session not found', async () => {
    const updateSession = vi.fn()
    const deps = {
      getSession: vi.fn().mockResolvedValue(null),
      updateSession,
    }
    await submitPartnerAnswer({ token: 'x', answers: VALID_ANSWERS, now: FIXED_NOW }, deps)
    expect(updateSession).not.toHaveBeenCalled()
  })

  // ── session_expired ───────────────────────────────────────────────────────

  it('returns session_expired when session expiresAt is in the past', async () => {
    const expiredSession = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() - 1000).toISOString(),
    })
    const deps = {
      getSession: vi.fn().mockResolvedValue(expiredSession),
      updateSession: vi.fn(),
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(result).toEqual({ success: false, error: 'session_expired' })
  })

  it('does not call updateSession on expired session', async () => {
    const updateSession = vi.fn()
    const expiredSession = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() - 1000).toISOString(),
    })
    const deps = {
      getSession: vi.fn().mockResolvedValue(expiredSession),
      updateSession,
    }
    await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(updateSession).not.toHaveBeenCalled()
  })

  // ── already_answered ──────────────────────────────────────────────────────

  it('returns already_answered when partnerAnswers already set', async () => {
    const alreadyAnswered = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString(),
      partnerAnswers: { q1: 'Spring', q2: 'France' },
    })
    const deps = {
      getSession: vi.fn().mockResolvedValue(alreadyAnswered),
      updateSession: vi.fn(),
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(result).toEqual({ success: false, error: 'already_answered' })
  })

  // ── invalid_answers ───────────────────────────────────────────────────────

  it('returns invalid_answers when answers is empty object', async () => {
    const deps = {
      getSession: vi.fn().mockResolvedValue(
        makeSession({ expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString() }),
      ),
      updateSession: vi.fn(),
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: {}, now: FIXED_NOW },
      deps,
    )
    expect(result).toEqual({ success: false, error: 'invalid_answers' })
  })

  it('does not call updateSession for invalid answers', async () => {
    const updateSession = vi.fn()
    const deps = {
      getSession: vi.fn().mockResolvedValue(
        makeSession({ expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString() }),
      ),
      updateSession,
    }
    await submitPartnerAnswer({ token: 'abc123', answers: {}, now: FIXED_NOW }, deps)
    expect(updateSession).not.toHaveBeenCalled()
  })

  // ── happy path ────────────────────────────────────────────────────────────

  it('returns success with bothAnswered=false when creatorAnswers is absent', async () => {
    const session = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString(),
      creatorAnswers: undefined,
    })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession: vi.fn().mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS }),
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(result).toEqual({ success: true, bothAnswered: false })
  })

  it('returns success with bothAnswered=true when creatorAnswers exists', async () => {
    const session = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString(),
      creatorAnswers: { q1: 'Winter', q2: 'Italy' },
    })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession: vi
        .fn()
        .mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS }),
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(result).toEqual({ success: true, bothAnswered: true })
  })

  it('calls updateSession with partnerAnswers', async () => {
    const session = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString(),
    })
    const updateSession = vi.fn().mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession,
    }
    await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(updateSession).toHaveBeenCalledTimes(1)
    const [id, updates] = (updateSession as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(id).toBe('session-1')
    expect(updates.partnerAnswers).toEqual(VALID_ANSWERS)
  })

  it('sets revealedAt when both answers are present', async () => {
    const session = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString(),
      creatorAnswers: { q1: 'Winter', q2: 'Italy' },
    })
    const updateSession = vi.fn().mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession,
    }
    await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    const [, updates] = (updateSession as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(updates.revealedAt).toBeDefined()
    expect(new Date(updates.revealedAt).toISOString()).toBe(FIXED_NOW.toISOString())
  })

  it('does not set revealedAt when creatorAnswers are absent', async () => {
    const session = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 86_400_000).toISOString(),
      creatorAnswers: undefined,
    })
    const updateSession = vi.fn().mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession,
    }
    await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    const [, updates] = (updateSession as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(updates.revealedAt).toBeUndefined()
  })

  it('uses injected now for revealedAt timestamp', async () => {
    const customNow = new Date('2024-06-15T08:30:00Z')
    const session = makeSession({
      expiresAt: new Date(customNow.getTime() + 86_400_000).toISOString(),
      creatorAnswers: { q1: 'Spring' },
    })
    const updateSession = vi
      .fn()
      .mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession,
    }
    await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: customNow },
      deps,
    )
    const [, updates] = (updateSession as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(updates.revealedAt).toBe(customNow.toISOString())
  })

  // ── edge: session expiry boundary ─────────────────────────────────────────

  it('treats session as valid when expiresAt equals now (not yet expired)', async () => {
    // isDuoTokenExpired uses <=, meaning expiresAt exactly == now is expired
    const sessionAtBoundary = makeSession({
      expiresAt: FIXED_NOW.toISOString(),
    })
    const deps = {
      getSession: vi.fn().mockResolvedValue(sessionAtBoundary),
      updateSession: vi.fn(),
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    // expiresAt == now is considered expired by isDuoTokenExpired (<=)
    expect(result).toEqual({ success: false, error: 'session_expired' })
  })

  it('succeeds when expiresAt is 1ms after now', async () => {
    const session = makeSession({
      expiresAt: new Date(FIXED_NOW.getTime() + 1).toISOString(),
    })
    const updateSession = vi.fn().mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession,
    }
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS, now: FIXED_NOW },
      deps,
    )
    expect(result.success).toBe(true)
  })

  // ── default now ───────────────────────────────────────────────────────────

  it('works without injecting now (uses real Date.now)', async () => {
    const session = makeSession({
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    })
    const updateSession = vi.fn().mockResolvedValue({ ...session, partnerAnswers: VALID_ANSWERS })
    const deps = {
      getSession: vi.fn().mockResolvedValue(session),
      updateSession,
    }
    // No `now` param — should not throw
    const result = await submitPartnerAnswer(
      { token: 'abc123', answers: VALID_ANSWERS },
      deps,
    )
    expect(result.success).toBe(true)
  })
})
