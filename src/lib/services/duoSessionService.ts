import type { DuoSession, NewDuoSession, Question, DuoSessionType } from '@/lib/types'
import { generateDuoToken, isDuoTokenExpired, createDuoExpiresAt } from '@/lib/duo/token'

export interface DuoSessionServiceDeps {
  createSession: (session: NewDuoSession) => Promise<DuoSession>
  getSession: (token: string) => Promise<DuoSession | null>
  updateSession: (id: string, updates: Partial<DuoSession>) => Promise<DuoSession>
  canUseDuoCheck: (userId: string) => Promise<boolean>
}

export type CreateSessionResult =
  | { success: true; sessionId: string; shareUrl: string; expiresAt: string }
  | { success: false; error: 'partner_not_found' | 'subscription_required' }

export type SubmitAnswerResult =
  | { success: true; bothAnswered: boolean }
  | {
      success: false
      error:
        | 'session_not_found'
        | 'session_expired'
        | 'already_answered'
        | 'invalid_answers'
    }

export async function createDuoSession(
  input: {
    partnerId: string
    sessionType: DuoSessionType
    questions: Question[]
    userId: string
    baseUrl: string
  },
  deps: DuoSessionServiceDeps,
): Promise<CreateSessionResult> {
  // Guard: subscription check
  const canUse = await deps.canUseDuoCheck(input.userId)
  if (!canUse) {
    return { success: false, error: 'subscription_required' }
  }

  // Generate token and expiry
  const token = generateDuoToken()
  const now = new Date()
  const expiresAt = createDuoExpiresAt(now)

  // Build new session object
  const newSession: NewDuoSession = {
    partnerId: input.partnerId,
    creatorId: input.userId,
    sessionType: input.sessionType,
    token,
    questions: input.questions,
    expiresAt,
  }

  // Persist
  const session = await deps.createSession(newSession)

  const shareUrl = `${input.baseUrl}/duo/${token}`

  return {
    success: true,
    sessionId: session.id,
    shareUrl,
    expiresAt: session.expiresAt,
  }
}

export async function submitPartnerAnswer(
  input: { token: string; answers: Record<string, string>; now?: Date },
  deps: Pick<DuoSessionServiceDeps, 'getSession' | 'updateSession'>,
): Promise<SubmitAnswerResult> {
  const now = input.now ?? new Date()

  // Look up session by token
  const session = await deps.getSession(input.token)
  if (session === null) {
    return { success: false, error: 'session_not_found' }
  }

  // Check expiry
  if (isDuoTokenExpired(session.expiresAt, now)) {
    return { success: false, error: 'session_expired' }
  }

  // Guard: not already answered
  if (session.partnerAnswers !== undefined) {
    return { success: false, error: 'already_answered' }
  }

  // Guard: answers must not be empty
  if (Object.keys(input.answers).length === 0) {
    return { success: false, error: 'invalid_answers' }
  }

  // Build update payload
  const updates: Partial<DuoSession> = {
    partnerAnswers: input.answers,
  }

  const bothAnswered = session.creatorAnswers !== undefined
  if (bothAnswered) {
    updates.revealedAt = now.toISOString()
  }

  await deps.updateSession(session.id, updates)

  return { success: true, bothAnswered }
}
