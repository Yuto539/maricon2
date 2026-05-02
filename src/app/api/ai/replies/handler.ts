import { z } from 'zod'
import type { Partner, UsageRecord } from '@/lib/types'
import type { AIProvider } from '@/lib/ai/provider'
import { generateReplies } from '@/lib/services/repliesService'
import { getRemainingRequests } from '@/lib/rateLimit'

const RepliesRequestSchema = z.object({
  partnerId: z.string().uuid(),
  latestMessage: z.string().min(1).max(1000),
  replyTone: z.enum(['casual', 'polite', 'sweet']),
  replyType: z.enum(['expand', 'close', 'question']),
})

export interface RepliesHandlerDeps {
  getPartner: (partnerId: string, userId: string) => Promise<Partner | null>
  getUsage: (userId: string, date: string) => Promise<UsageRecord>
  incrementUsage: (userId: string, date: string) => Promise<void>
  aiProvider: AIProvider
  today?: string
}

export interface RepliesHandlerResponse {
  status: number
  body: unknown
}

export async function handleRepliesRequest(
  body: unknown,
  userId: string,
  deps: RepliesHandlerDeps,
): Promise<RepliesHandlerResponse> {
  // 1. Validate
  const parsed = RepliesRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: 'Invalid request', details: parsed.error.flatten() },
    }
  }

  const { partnerId, latestMessage, replyTone, replyType } = parsed.data
  const today = deps.today ?? new Date().toISOString().split('T')[0]

  // 2. Bridge date-keyed deps to service interface
  const serviceDeps = {
    aiProvider: deps.aiProvider,
    getPartner: deps.getPartner,
    getUsage: (_userId: string) => deps.getUsage(_userId, today),
    incrementUsage: (_userId: string) => deps.incrementUsage(_userId, today),
  }

  // 3. Fetch usage before service call to compute remaining accurately
  const usageBefore = await deps.getUsage(userId, today)

  // 4. Call service
  const result = await generateReplies(
    { partnerId, latestMessage, replyTone, replyType, userId },
    serviceDeps,
  )

  if (!result.success) {
    if (result.error === 'partner_not_found') {
      return { status: 404, body: { error: 'Partner not found' } }
    }
    if (result.error === 'rate_limit_exceeded') {
      return { status: 429, body: { error: 'Rate limit exceeded', remaining: 0 } }
    }
    return { status: 500, body: { error: 'AI service error' } }
  }

  // 5. Remaining: subtract 1 from pre-call count (service incremented inside)
  const remaining =
    usageBefore.subscriptionTier !== 'free'
      ? -1
      : Math.max(0, getRemainingRequests(usageBefore) - 1)

  return {
    status: 200,
    body: { replies: result.replies, remaining },
  }
}
