import { z } from 'zod'
import type { DuoSession, NewDuoSession, DuoSessionType, Question } from '@/lib/types'
import { generateDuoToken, createDuoExpiresAt } from '@/lib/duo/token'

const DuoCreateRequestSchema = z.object({
  partnerId: z.string().uuid(),
  sessionType: z.enum(['answer_card', 'quiz', 'date_plan']),
  questions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        options: z.array(z.string()).optional(),
      }),
    )
    .min(1)
    .max(20),
})

export interface DuoCreateHandlerDeps {
  createSession: (data: NewDuoSession) => Promise<DuoSession>
  canUseDuoCheck: (userId: string) => Promise<boolean>
  baseUrl: string
}

export interface DuoCreateHandlerResponse {
  status: number
  body: unknown
}

export async function handleDuoCreateRequest(
  body: unknown,
  userId: string,
  deps: DuoCreateHandlerDeps,
): Promise<DuoCreateHandlerResponse> {
  // 1. Validate
  const parsed = DuoCreateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: 'Invalid request', details: parsed.error.flatten() },
    }
  }

  const { partnerId, sessionType, questions } = parsed.data

  // 2. Subscription / access check
  const canUse = await deps.canUseDuoCheck(userId)
  if (!canUse) {
    return { status: 403, body: { error: 'Subscription required' } }
  }

  // 3. Generate token and expiry
  const token = generateDuoToken()
  const expiresAt = createDuoExpiresAt(new Date())

  // 4. Persist session
  const newSession: NewDuoSession = {
    partnerId,
    creatorId: userId,
    sessionType: sessionType as DuoSessionType,
    token,
    questions: questions as Question[],
    expiresAt,
  }
  const session = await deps.createSession(newSession)

  const shareUrl = `${deps.baseUrl}/duo/${token}`

  return {
    status: 200,
    body: {
      sessionId: session.id,
      shareUrl,
      expiresAt: session.expiresAt,
    },
  }
}
