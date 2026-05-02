export interface ConversationMessage {
  sender: 'me' | 'partner'
  sentAt: string
  sentiment: number // -1 to 1
}

export interface HealthBreakdown {
  replyInterval: number         // 0-100: lower avg interval = higher score
  topicDiversity: number        // 0-100: derived from sentiment variance
  selfDisclosureBalance: number // 0-100: 100 = perfect 50/50 message ratio
  messageRatio: number          // 0-100: % of messages sent by 'me'
}

export type HealthTrend = 'improving' | 'stable' | 'declining'

export interface HealthScoreResult {
  score: number
  breakdown: HealthBreakdown
  trend: HealthTrend
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Clamp a value to [0, 100] */
function clamp100(v: number): number {
  return Math.min(100, Math.max(0, v))
}

/**
 * Calculate messageRatio: percentage (0-100) of messages sent by 'me'.
 * Returns 50 for empty input (neutral / no data).
 */
function calcMessageRatio(messages: ConversationMessage[]): number {
  if (messages.length === 0) return 50
  const myCount = messages.filter((m) => m.sender === 'me').length
  return (myCount / messages.length) * 100
}

/**
 * Self-disclosure balance: 100 = perfect 50/50.
 * Formula: 100 - 2 * |ratio - 50|
 * Distance from 50%, scaled so 0% or 100% me → balance 0.
 */
function calcSelfDisclosureBalance(ratio: number): number {
  return clamp100(100 - 2 * Math.abs(ratio - 50))
}

/**
 * Reply-interval score: converts average interval in minutes to 0-100.
 * Uses exponential decay: score = 100 * e^(-avgMinutes / 30).
 * Fast (2 min) → ~93. Slow (120 min) → ~2.
 */
function calcReplyIntervalScore(messages: ConversationMessage[]): number {
  if (messages.length < 2) return 50 // no interval data → neutral

  const ms = messages.map((m) => new Date(m.sentAt).getTime())
  const intervals: number[] = []
  for (let i = 1; i < ms.length; i++) {
    const diffMin = (ms[i] - ms[i - 1]) / 60_000
    if (diffMin >= 0) intervals.push(diffMin)
  }

  if (intervals.length === 0) return 50

  const avgMinutes = intervals.reduce((a, b) => a + b, 0) / intervals.length
  return clamp100(100 * Math.exp(-avgMinutes / 30))
}

/**
 * Topic diversity score: uses variance of sentiment values as a proxy
 * for diverse conversational range (high variance = more diverse topics).
 * Normalised to 0-100.
 */
function calcTopicDiversity(messages: ConversationMessage[]): number {
  if (messages.length < 2) return 50

  const sentiments = messages.map((m) => m.sentiment)
  const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
  const variance =
    sentiments.reduce((a, v) => a + (v - mean) ** 2, 0) / sentiments.length

  // Sentiment range is [-1,1], max possible variance ≈ 1.0
  // Normalise: score = variance / 1.0 * 100, clamped to 100
  return clamp100(variance * 100)
}

/**
 * Trend: compare average sentiment of the first half vs the second half.
 * Requires at least 4 messages for a meaningful comparison.
 */
function calcTrend(messages: ConversationMessage[]): HealthTrend {
  if (messages.length < 4) return 'stable'

  const mid = Math.floor(messages.length / 2)
  const firstHalf = messages.slice(0, mid)
  const secondHalf = messages.slice(mid)

  const avgSentiment = (arr: ConversationMessage[]) =>
    arr.reduce((a, m) => a + m.sentiment, 0) / arr.length

  const firstAvg = avgSentiment(firstHalf)
  const secondAvg = avgSentiment(secondHalf)

  const THRESHOLD = 0.2
  if (secondAvg - firstAvg > THRESHOLD) return 'improving'
  if (firstAvg - secondAvg > THRESHOLD) return 'declining'
  return 'stable'
}

// ── Main export ────────────────────────────────────────────────────────────

export function calculateHealthScore(
  messages: ConversationMessage[],
): HealthScoreResult {
  if (messages.length === 0) {
    return {
      score: 0,
      breakdown: {
        replyInterval: 50,
        topicDiversity: 50,
        selfDisclosureBalance: 100,
        messageRatio: 50,
      },
      trend: 'stable',
    }
  }

  const messageRatio = calcMessageRatio(messages)
  const selfDisclosureBalance = calcSelfDisclosureBalance(messageRatio)
  const replyInterval = calcReplyIntervalScore(messages)
  const topicDiversity = calcTopicDiversity(messages)

  const breakdown: HealthBreakdown = {
    replyInterval,
    topicDiversity,
    selfDisclosureBalance,
    messageRatio,
  }

  // Weighted average: replyInterval 30%, selfDisclosureBalance 30%,
  // topicDiversity 20%, positive-sentiment contribution 20%
  const avgSentiment =
    messages.reduce((a, m) => a + m.sentiment, 0) / messages.length
  const sentimentScore = clamp100((avgSentiment + 1) * 50) // map [-1,1] → [0,100]

  const score = clamp100(
    replyInterval * 0.3 +
      selfDisclosureBalance * 0.3 +
      topicDiversity * 0.2 +
      sentimentScore * 0.2,
  )

  const trend = calcTrend(messages)

  return { score, breakdown, trend }
}
