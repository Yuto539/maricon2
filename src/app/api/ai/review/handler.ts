import { z } from 'zod'
import type { Partner } from '@/lib/types'
import type { AIProvider } from '@/lib/ai/provider'
import { reviewMessage } from '@/lib/services/reviewService'

const ReviewRequestSchema = z.object({
  text: z.string().min(1).max(500),
  partnerId: z.string().uuid(),
})

export interface ReviewHandlerDeps {
  getPartner: (partnerId: string, userId: string) => Promise<Partner | null>
  aiProvider: AIProvider
}

export interface ReviewHandlerResponse {
  status: number
  body: unknown
}

export async function handleReviewRequest(
  body: unknown,
  userId: string,
  deps: ReviewHandlerDeps,
): Promise<ReviewHandlerResponse> {
  // 1. Validate
  const parsed = ReviewRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: 'Invalid request', details: parsed.error.flatten() },
    }
  }

  const { text, partnerId } = parsed.data

  // 2. Partner existence check
  const partner = await deps.getPartner(partnerId, userId)
  if (partner === null) {
    return { status: 404, body: { error: 'Partner not found' } }
  }

  // 3. Review (no rate limit for review)
  const result = await reviewMessage({ text }, { aiProvider: deps.aiProvider })

  if (!result.success) {
    return { status: 500, body: { error: 'AI service error' } }
  }

  return {
    status: 200,
    body: { review: result.review },
  }
}
