import type { AIProvider } from '@/lib/ai/provider'

export interface ReviewIssue {
  type: 'landmine_word' | 'too_long' | 'too_short' | 'self_centered' | 'emoji_overuse'
  message: string
  severity: 'warning' | 'error'
}

export type ReviewTone = 'too_heavy' | 'balanced' | 'too_light'

export interface ReviewResult {
  score: number
  tone: ReviewTone
  issues: ReviewIssue[]
  suggestion: string
}

export type ReviewServiceResult =
  | { success: true; review: ReviewResult }
  | { success: false; error: 'ai_error' | 'parse_error' }

export interface ReviewServiceDeps {
  aiProvider: AIProvider
}

// Emoji regex — matches any Unicode emoji character
const EMOJI_REGEX = /\p{Emoji}/gu

function countEmojis(text: string): number {
  const matches = text.match(EMOJI_REGEX)
  return matches ? matches.length : 0
}

function getLocalIssues(text: string): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  if (text.length > 200) {
    issues.push({
      type: 'too_long',
      message: 'Message is too long (over 200 characters)',
      severity: 'warning',
    })
  }

  if (text.length < 5) {
    issues.push({
      type: 'too_short',
      message: 'Message is too short (fewer than 5 characters)',
      severity: 'warning',
    })
  }

  if (countEmojis(text) > 3) {
    issues.push({
      type: 'emoji_overuse',
      message: 'Too many emojis (more than 3)',
      severity: 'warning',
    })
  }

  return issues
}

interface AIReviewResponse {
  score: number
  tone: ReviewTone
  aiIssues: ReviewIssue[]
  suggestion: string
}

function isValidAIResponse(parsed: unknown): parsed is AIReviewResponse {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false
  const obj = parsed as Record<string, unknown>
  if (typeof obj.score !== 'number') return false
  if (typeof obj.tone !== 'string') return false
  if (!Array.isArray(obj.aiIssues)) return false
  if (typeof obj.suggestion !== 'string') return false
  return true
}

const REVIEW_SYSTEM_PROMPT = [
  'あなたは婚活メッセージのレビュー専門家です。',
  '以下のメッセージを分析し、次のJSONフォーマットで返してください:',
  '{ "score": 0-100, "tone": "too_heavy"|"balanced"|"too_light", "aiIssues": [...], "suggestion": "..." }',
  'aiIssues の各要素は { "type": "landmine_word"|"self_centered", "message": "説明", "severity": "warning"|"error" } の形式。',
  '余計な説明は不要です。JSONのみ返してください。',
].join('\n')

export async function reviewMessage(
  input: { text: string },
  deps: ReviewServiceDeps,
): Promise<ReviewServiceResult> {
  // Compute local issues first (no AI needed)
  const localIssues = getLocalIssues(input.text)

  // Call AI for deeper analysis
  let rawResponse: string
  try {
    rawResponse = await deps.aiProvider.generateText(input.text, REVIEW_SYSTEM_PROMPT)
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

  if (!isValidAIResponse(parsed)) {
    return { success: false, error: 'parse_error' }
  }

  // Merge local issues + AI issues
  const allIssues: ReviewIssue[] = [...localIssues, ...parsed.aiIssues]

  return {
    success: true,
    review: {
      score: parsed.score,
      tone: parsed.tone,
      issues: allIssues,
      suggestion: parsed.suggestion,
    },
  }
}
