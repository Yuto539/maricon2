// ── Shared domain types for TalkBridge ────────────────────────────────────

export interface Partner {
  id: string
  userId: string
  nickname: string
  age?: number
  occupation?: string
  metVia?: string
  profileNotes?: string
  tags: string[]
  status: 'active' | 'paused' | 'ended'
  bondLevel: number
  streakDays: number
  lastContactAt?: string
  createdAt: string
}

export interface Message {
  id: string
  partnerId: string
  sender: 'me' | 'partner'
  content: string
  sentAt: string
  topicTags?: string[]
  sentiment?: number
  createdAt: string
}

export interface UsageRecord {
  userId: string
  date: string // 'YYYY-MM-DD'
  aiRequestsToday: number
  subscriptionTier: 'free' | 'pro' | 'couples'
}

export interface DuoSession {
  id: string
  partnerId: string
  creatorId: string
  sessionType: 'answer_card' | 'quiz' | 'date_plan'
  token: string
  questions: Question[]
  creatorAnswers?: Record<string, string>
  partnerAnswers?: Record<string, string>
  revealedAt?: string
  expiresAt: string
  partnerViewed: boolean
  createdAt: string
}

export interface Question {
  id: string
  text: string
  options?: string[]
}

export type NewDuoSession = Omit<DuoSession, 'id' | 'createdAt' | 'partnerViewed'> & {
  partnerViewed?: boolean
}

export interface Badge {
  id: string
  userId: string
  partnerId?: string
  badgeType: string
  earnedAt: string
}

export type SceneType = 'morning' | 'evening' | 'weekend' | 'after_date' | 'general'
export type ReplyTone = 'casual' | 'polite' | 'sweet'
export type ReplyType = 'expand' | 'close' | 'question'
export type DuoSessionType = 'answer_card' | 'quiz' | 'date_plan'
export type SubscriptionTier = 'free' | 'pro' | 'couples'
