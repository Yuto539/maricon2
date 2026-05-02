import { z } from 'zod'
import type { Partner, Message, UsageRecord } from '@/lib/types'
import type { AIProvider } from '@/lib/ai/provider'
import type { TopicResult } from '@/lib/services/topicsService'
import { generateTopics } from '@/lib/services/topicsService'
import { getRemainingRequests } from '@/lib/rateLimit'

const TopicsRequestSchema = z.object({
  partnerId: z.string().uuid(),
  sceneType: z
    .enum(['morning', 'evening', 'weekend', 'after_date', 'general'])
    .default('general'),
})

export interface TopicsHandlerDeps {
  getPartner: (partnerId: string, userId: string) => Promise<Partner | null>
  getRecentMessages: (partnerId: string, limit: number) => Promise<Message[]>
  getUsage: (userId: string, date: string) => Promise<UsageRecord>
  incrementUsage: (userId: string, date: string) => Promise<void>
  aiProvider: AIProvider
  today?: string
}

export interface TopicsHandlerResponse {
  status: number
  body: unknown
}

export async function handleTopicsRequest(
  body: unknown,
  userId: string,
  deps: TopicsHandlerDeps,
): Promise<TopicsHandlerResponse> {
  // 1. Validate request body
  const parsed = TopicsRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: 'Invalid request', details: parsed.error.flatten() },
    }
  }

  const { partnerId, sceneType } = parsed.data
  const today = deps.today ?? new Date().toISOString().split('T')[0]

  // 2. Adapt deps: service uses (userId: string) => Promise<UsageRecord>
  //    but handler gets date-keyed usage; bridge with closure
  const serviceDeps = {
    aiProvider: deps.aiProvider,
    getPartner: deps.getPartner,
    getRecentMessages: deps.getRecentMessages,
    getUsage: (_userId: string) => deps.getUsage(_userId, today),
    incrementUsage: (_userId: string) => deps.incrementUsage(_userId, today),
  }

  // 3. Fetch usage once (before service call) to compute remaining
  const usageBefore = await deps.getUsage(userId, today)

  // 4. Call service
  const result = await generateTopics({ partnerId, sceneType, userId }, serviceDeps)

  if (!result.success) {
    if (result.error === 'partner_not_found') {
      return { status: 404, body: { error: 'Partner not found' } }
    }
    if (result.error === 'rate_limit_exceeded') {
      return { status: 429, body: { error: 'Rate limit exceeded', remaining: 0 } }
    }
    // ai_error | parse_error
    return { status: 500, body: { error: 'AI service error' } }
  }

  // 5. Compute remaining: subtract 1 from pre-call count (service already incremented)
  const remaining =
    usageBefore.subscriptionTier !== 'free'
      ? -1
      : Math.max(0, getRemainingRequests(usageBefore) - 1)

  return {
    status: 200,
    body: { topics: result.topics, remaining },
  }
}
