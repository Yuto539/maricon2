export type SubscriptionTier = 'free' | 'pro' | 'couples'

export interface UserSubscription {
  tier: SubscriptionTier
  expiresAt?: string | null
  partnersCount: number
}

const FREE_MAX_PARTNERS = 2

export function canAddPartner(sub: UserSubscription): boolean {
  if (sub.tier !== 'free') return true
  return sub.partnersCount < FREE_MAX_PARTNERS
}

export function canUseDuoFeatures(_sub: UserSubscription): boolean {
  // All tiers can use Duo features (viral mechanic)
  return true
}

export function canViewSharedTimeline(sub: UserSubscription): boolean {
  return sub.tier === 'couples'
}

export function isSubscriptionActive(sub: UserSubscription, now?: Date): boolean {
  // Free tier is always active
  if (sub.tier === 'free') return true

  // No expiry set means it never expires (legacy)
  if (sub.expiresAt == null) return true

  const reference = now ?? new Date()
  return new Date(sub.expiresAt).getTime() > reference.getTime()
}
