import { z } from 'zod'
import type { DuoSession } from '@/lib/types'
import { submitPartnerAnswer } from '@/lib/services/duoSessionService'

const DuoAnswerRequestSchema = z.object({
  answers: z
    .record(z.string(), z.string())
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'At least one answer required',
    }),
})

export interface DuoAnswerHandlerDeps {
  getSession: (token: string) => Promise<DuoSession | null>
  updateSession: (id: string, data: Partial<DuoSession>) => Promise<DuoSession>
  now?: Date
}

export interface DuoAnswerHandlerResponse {
  status: number
  body: unknown
}

export async function handleDuoAnswerRequest(
  token: string,
  body: unknown,
  deps: DuoAnswerHandlerDeps,
): Promise<DuoAnswerHandlerResponse> {
  // 1. Validate
  const parsed = DuoAnswerRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: 'Invalid request', details: parsed.error.flatten() },
    }
  }

  const { answers } = parsed.data

  // Wrap updateSession to capture the result (for revealedAt)
  let lastUpdated: DuoSession | undefined
  const wrappedUpdateSession = async (
    id: string,
    data: Partial<DuoSession>,
  ): Promise<DuoSession> => {
    const updated = await deps.updateSession(id, data)
    lastUpdated = updated
    return updated
  }

  // 2. Call service
  const result = await submitPartnerAnswer(
    { token, answers, now: deps.now },
    { getSession: deps.getSession, updateSession: wrappedUpdateSession },
  )

  if (!result.success) {
    if (result.error === 'session_not_found') {
      return { status: 404, body: { error: 'Session not found' } }
    }
    if (result.error === 'session_expired') {
      return { status: 410, body: { error: 'Session expired' } }
    }
    if (result.error === 'already_answered') {
      return { status: 409, body: { error: 'Already answered' } }
    }
    // invalid_answers
    return { status: 400, body: { error: 'Invalid request', details: {} } }
  }

  // 3. Build response
  const responseBody: { bothAnswered: boolean; revealedAt?: string } = {
    bothAnswered: result.bothAnswered,
  }

  if (result.bothAnswered && lastUpdated?.revealedAt !== undefined) {
    responseBody.revealedAt = lastUpdated.revealedAt
  }

  return { status: 200, body: responseBody }
}
