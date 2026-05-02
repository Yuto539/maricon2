export interface UsageRecord {
  userId: string
  date: string // 'YYYY-MM-DD'
  aiRequestsToday: number
  subscriptionTier: 'free' | 'pro' | 'couples'
}

const FREE_TIER_DAILY_LIMIT = 5

export function getMaxRequestsPerDay(
  tier: 'free' | 'pro' | 'couples',
): number {
  if (tier === 'free') return FREE_TIER_DAILY_LIMIT
  return -1
}

export function canMakeAIRequest(usage: UsageRecord): boolean {
  if (usage.subscriptionTier !== 'free') return true
  return usage.aiRequestsToday < FREE_TIER_DAILY_LIMIT
}

export function getRemainingRequests(usage: UsageRecord): number {
  if (usage.subscriptionTier !== 'free') return -1
  return Math.max(0, FREE_TIER_DAILY_LIMIT - usage.aiRequestsToday)
}
