import { randomUUID } from 'crypto'
import type { AIProvider } from '@/lib/ai/provider'
import type { Partner, Message, UsageRecord, SceneType } from '@/lib/types'
import { canMakeAIRequest } from '@/lib/rateLimit'
import { buildTopicPrompt } from '@/lib/ai/prompts/topics'

export interface TopicsServiceDeps {
  aiProvider: AIProvider
  getPartner: (partnerId: string, userId: string) => Promise<Partner | null>
  getRecentMessages: (partnerId: string, limit: number) => Promise<Message[]>
  getUsage: (userId: string) => Promise<UsageRecord>
  incrementUsage: (userId: string) => Promise<void>
}

export interface TopicResult {
  id: string
  text: string
  category: string
  depth: 'light' | 'medium' | 'deep'
}

export type TopicsServiceResult =
  | { success: true; topics: TopicResult[] }
  | {
      success: false
      error: 'partner_not_found' | 'rate_limit_exceeded' | 'ai_error' | 'parse_error'
    }

const RECENT_MESSAGES_LIMIT = 10

export async function generateTopics(
  input: { partnerId: string; sceneType: SceneType; userId: string },
  deps: TopicsServiceDeps,
): Promise<TopicsServiceResult> {
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

  // Fetch recent messages for context
  const recentMessages = await deps.getRecentMessages(input.partnerId, RECENT_MESSAGES_LIMIT)

  // Build prompt
  const { systemPrompt, userPrompt } = buildTopicPrompt({
    partner: {
      nickname: partner.nickname,
      age: partner.age,
      occupation: partner.occupation,
      tags: partner.tags,
      profileNotes: partner.profileNotes,
    },
    recentMessages: recentMessages.map((m) => ({
      sender: m.sender,
      content: m.content,
      sentAt: m.sentAt,
    })),
    sceneType: input.sceneType,
  })

  // Call AI
  let rawResponse: string
  try {
    rawResponse = await deps.aiProvider.generateText(userPrompt, systemPrompt)
  } catch {
    return { success: false, error: 'ai_error' }
  }

  // Parse AI response
  let parsed: unknown
  try {
    parsed = JSON.parse(rawResponse)
  } catch {
    return { success: false, error: 'parse_error' }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { success: false, error: 'parse_error' }
  }

  // Map to TopicResult with generated IDs
  const topics: TopicResult[] = parsed.map((item: unknown) => {
    const t = item as { text: string; category: string; depth: 'light' | 'medium' | 'deep' }
    return {
      id: randomUUID(),
      text: t.text,
      category: t.category,
      depth: t.depth,
    }
  })

  // Side-effect: increment usage after success
  await deps.incrementUsage(input.userId)

  return { success: true, topics }
}
