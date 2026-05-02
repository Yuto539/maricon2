export interface BondScoreInput {
  replyConsistencyScore: number
  topicDiversityScore: number
  messageDepthScore: number
  duoFeaturesScore: number
  streakBonus: number
}

export type BondLabel =
  | 'はじめまして'
  | '知り合い'
  | '友達感覚'
  | '気になる存在'
  | '深い関係'

export interface BondResult {
  level: number
  label: BondLabel
}

const LABEL_THRESHOLDS: Array<{ min: number; label: BondLabel }> = [
  { min: 81, label: '深い関係' },
  { min: 61, label: '気になる存在' },
  { min: 41, label: '友達感覚' },
  { min: 21, label: '知り合い' },
  { min: 0, label: 'はじめまして' },
]

export function getBondLevelLabel(level: number): BondLabel {
  return getBondLabel(level)
}

function getBondLabel(level: number): BondLabel {
  for (const threshold of LABEL_THRESHOLDS) {
    if (level >= threshold.min) {
      return threshold.label
    }
  }
  return 'はじめまして'
}

export function calculateBondLevel(input: BondScoreInput): BondResult {
  const raw =
    input.replyConsistencyScore * 0.3 +
    input.topicDiversityScore * 0.2 +
    input.messageDepthScore * 0.2 +
    input.duoFeaturesScore * 0.2 +
    input.streakBonus * 0.1

  const level = Math.min(100, Math.max(0, raw))
  const label = getBondLabel(level)

  return { level, label }
}
