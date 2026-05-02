import type { Partner, Message, Badge } from '@/lib/types'
import { calculateBondLevel } from '@/lib/gamification/bond'
import { calculateStreak } from '@/lib/gamification/streak'
import { calculateHealthScore } from '@/lib/health/score'

export interface DailyChallenge {
  id: string
  challengeText: string
  completed: boolean
}

export interface GamificationHandlerDeps {
  getPartner: (partnerId: string, userId: string) => Promise<Partner | null>
  getMessages: (partnerId: string) => Promise<Message[]>
  getBadges: (userId: string) => Promise<Badge[]>
  getDailyChallenge: (
    userId: string,
    partnerId: string,
    date: string,
  ) => Promise<DailyChallenge | null>
  today?: string
}

export interface GamificationHandlerResponse {
  status: number
  body: unknown
}

export async function handleGamificationRequest(
  partnerId: string,
  userId: string,
  deps: GamificationHandlerDeps,
): Promise<GamificationHandlerResponse> {
  const today = deps.today ?? new Date().toISOString().split('T')[0]

  // 1. Get partner (404 guard)
  const partner = await deps.getPartner(partnerId, userId)
  if (partner === null) {
    return { status: 404, body: { error: 'Partner not found' } }
  }

  // 2. Fetch all messages — used for both health score and streak
  const messages = await deps.getMessages(partnerId)

  // 3. Calculate health score
  const healthScore = calculateHealthScore(
    messages.map((m) => ({
      sender: m.sender,
      sentAt: m.sentAt,
      sentiment: m.sentiment ?? 0,
    })),
  )

  // 4. Calculate streak using message dates
  const messageDates = messages.map((m) => m.sentAt)
  const { streakDays } = calculateStreak(messageDates, today)

  // 5. Calculate bond level
  const bondResult = calculateBondLevel({
    replyConsistencyScore: healthScore.breakdown.replyInterval,
    topicDiversityScore: healthScore.breakdown.topicDiversity,
    messageDepthScore: healthScore.breakdown.selfDisclosureBalance,
    duoFeaturesScore: 0,
    streakBonus: Math.min(100, streakDays * 10),
  })

  // 6. Get badges and daily challenge in parallel
  const [badges, dailyChallenge] = await Promise.all([
    deps.getBadges(userId),
    deps.getDailyChallenge(userId, partnerId, today),
  ])

  return {
    status: 200,
    body: {
      bondLevel: Math.round(bondResult.level),
      bondLevelLabel: bondResult.label,
      streakDays,
      healthScore,
      badges: badges.map((b) => ({ badgeType: b.badgeType, earnedAt: b.earnedAt })),
      dailyChallenge,
    },
  }
}
