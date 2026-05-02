import type { AIProvider } from '@/lib/ai/provider'
import type { Partner, UsageRecord, ReplyTone, ReplyType } from '@/lib/types'
import { canMakeAIRequest } from '@/lib/rateLimit'
import { buildReplyPrompt } from '@/lib/ai/prompts/replies'

export interface RepliesServiceDeps {
  aiProvider: AIProvider
  getPartner: (partnerId: string, userId: string) => Promise<Partner | null>
  getUsage: (userId: string) => Promise<UsageRecord>
  incrementUsage: (userId: string) => Promise<void>
}

export interface ReplyResult {
  tone: ReplyTone
  text: string
}

export type RepliesServiceResult =
  | { success: true; replies: ReplyResult[] }
  | {
      success: false
      error: 'partner_not_found' | 'rate_limit_exceeded' | 'ai_error' | 'parse_error'
    }

export async function generateReplies(
  input: {
    partnerId: string
    latestMessage: string
    replyTone: ReplyTone
    replyType: ReplyType
    userId: string
  },
  deps: RepliesServiceDeps,
): Promise<RepliesServiceResult> {
  // Guard: partner must exist
  const partner = await deps.getPartner(input.partnerId, input.userId)
  if (partner === null) {
    return { success: false, error: 'partner_not_found' }
  }

  // Guard: rate limit
  const usage = await deps.getUsage(input.userId)
  if (!canMakeAIRequest(usage)) {
    return { success: false, error: 'rate_limit_exceeded' }
  }

  // Build prompt
  const { systemPrompt, userPrompt } = buildReplyPrompt({
    partner: {
      nickname: partner.nickname,
      age: partner.age,
      occupation: partner.occupation,
      tags: partner.tags,
      profileNotes: partner.profileNotes,
    },
    latestMessage: input.latestMessage,
    replyTone: input.replyTone,
    replyType: input.replyType,
  })

  // Call AI
  let rawResponse: string
  try {
    rawResponse = await deps.aiProvider.generateText(userPrompt, systemPrompt)
  } catch {
    return { success: false, error: 'ai_error' }
  }

  // Parse AI response: expected { "reply": "..." }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawResponse)
  } catch {
    return { success: false, error: 'parse_error' }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as Record<string, unknown>).reply !== 'string' ||
    (parsed as Record<string, unknown>).reply === ''
  ) {
    return { success: false, error: 'parse_error' }
  }

  const replyText = (parsed as Record<string, string>).reply

  // Side-effect: increment usage after success
  await deps.incrementUsage(input.userId)

  return {
    success: true,
    replies: [{ tone: input.replyTone, text: replyText }],
  }
}
