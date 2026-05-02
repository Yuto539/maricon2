export type BadgeId =
  | 'first_message'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'duo_first'
  | 'topic_master'
  | 'first_ai_use'

export interface UserStats {
  messagesCount: number
  streakDays: number
  duoSessionsCount: number
  topicCategoriesUsed: number
  aiRequestsCount: number
}

interface BadgeRule {
  id: BadgeId
  condition: (stats: UserStats) => boolean
}

const BADGE_RULES: BadgeRule[] = [
  {
    id: 'first_message',
    condition: (s) => s.messagesCount >= 1,
  },
  {
    id: 'streak_3',
    condition: (s) => s.streakDays >= 3,
  },
  {
    id: 'streak_7',
    condition: (s) => s.streakDays >= 7,
  },
  {
    id: 'streak_30',
    condition: (s) => s.streakDays >= 30,
  },
  {
    id: 'duo_first',
    condition: (s) => s.duoSessionsCount >= 1,
  },
  {
    id: 'topic_master',
    condition: (s) => s.topicCategoriesUsed >= 10,
  },
  {
    id: 'first_ai_use',
    condition: (s) => s.aiRequestsCount >= 1,
  },
]

export function evaluateBadges(stats: UserStats): BadgeId[] {
  return BADGE_RULES.filter((rule) => rule.condition(stats)).map(
    (rule) => rule.id,
  )
}
