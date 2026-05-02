import { describe, it, expect } from 'vitest'
import { calculateBondLevel, BondScoreInput } from './bond'

describe('calculateBondLevel', () => {
  // ── Happy path: formula correctness ────────────────────────────────────────

  it('calculates bond level using the weighted formula', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 100,
      topicDiversityScore: 100,
      messageDepthScore: 100,
      duoFeaturesScore: 100,
      streakBonus: 100,
    }
    // 100*0.3 + 100*0.2 + 100*0.2 + 100*0.2 + 100*0.1 = 100
    const result = calculateBondLevel(input)
    expect(result.level).toBe(100)
  })

  it('calculates a mixed score correctly', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 80,
      topicDiversityScore: 60,
      messageDepthScore: 40,
      duoFeaturesScore: 20,
      streakBonus: 0,
    }
    // 80*0.3 + 60*0.2 + 40*0.2 + 20*0.2 + 0*0.1
    // = 24 + 12 + 8 + 4 + 0 = 48
    const result = calculateBondLevel(input)
    expect(result.level).toBeCloseTo(48, 5)
  })

  it('returns 0 when all scores are 0', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 0,
      topicDiversityScore: 0,
      messageDepthScore: 0,
      duoFeaturesScore: 0,
      streakBonus: 0,
    }
    const result = calculateBondLevel(input)
    expect(result.level).toBe(0)
  })

  // ── Clamping ────────────────────────────────────────────────────────────────

  it('clamps level to 100 when inputs exceed 100', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 200,
      topicDiversityScore: 200,
      messageDepthScore: 200,
      duoFeaturesScore: 200,
      streakBonus: 200,
    }
    const result = calculateBondLevel(input)
    expect(result.level).toBe(100)
  })

  it('clamps level to 0 when inputs are negative', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: -50,
      topicDiversityScore: -50,
      messageDepthScore: -50,
      duoFeaturesScore: -50,
      streakBonus: -50,
    }
    const result = calculateBondLevel(input)
    expect(result.level).toBe(0)
  })

  it('clamps level to 0 even when some inputs are negative and some are 0', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: -10,
      topicDiversityScore: 0,
      messageDepthScore: 0,
      duoFeaturesScore: 0,
      streakBonus: 0,
    }
    const result = calculateBondLevel(input)
    expect(result.level).toBe(0)
  })

  // ── Label mapping ───────────────────────────────────────────────────────────

  it('returns label "はじめまして" for level 0', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 0,
      topicDiversityScore: 0,
      messageDepthScore: 0,
      duoFeaturesScore: 0,
      streakBonus: 0,
    }
    expect(calculateBondLevel(input).label).toBe('はじめまして')
  })

  it('returns label "はじめまして" for level 20 (boundary)', () => {
    // Need level exactly 20:
    // replyConsistencyScore * 0.3 = 20 => replyConsistencyScore = ~66.67, rest 0
    // simpler: all equal → 20 total: each at 20 → 20*0.3+20*0.2+20*0.2+20*0.2+20*0.1=20
    const input: BondScoreInput = {
      replyConsistencyScore: 20,
      topicDiversityScore: 20,
      messageDepthScore: 20,
      duoFeaturesScore: 20,
      streakBonus: 20,
    }
    expect(calculateBondLevel(input).label).toBe('はじめまして')
  })

  it('returns label "知り合い" for level 21 (boundary)', () => {
    // All equal → 21*1=21
    const input: BondScoreInput = {
      replyConsistencyScore: 21,
      topicDiversityScore: 21,
      messageDepthScore: 21,
      duoFeaturesScore: 21,
      streakBonus: 21,
    }
    expect(calculateBondLevel(input).label).toBe('知り合い')
  })

  it('returns label "知り合い" for level 40 (boundary)', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 40,
      topicDiversityScore: 40,
      messageDepthScore: 40,
      duoFeaturesScore: 40,
      streakBonus: 40,
    }
    expect(calculateBondLevel(input).label).toBe('知り合い')
  })

  it('returns label "友達感覚" for level 41 (boundary)', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 41,
      topicDiversityScore: 41,
      messageDepthScore: 41,
      duoFeaturesScore: 41,
      streakBonus: 41,
    }
    expect(calculateBondLevel(input).label).toBe('友達感覚')
  })

  it('returns label "友達感覚" for level 60 (boundary)', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 60,
      topicDiversityScore: 60,
      messageDepthScore: 60,
      duoFeaturesScore: 60,
      streakBonus: 60,
    }
    expect(calculateBondLevel(input).label).toBe('友達感覚')
  })

  it('returns label "気になる存在" for level 61 (boundary)', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 61,
      topicDiversityScore: 61,
      messageDepthScore: 61,
      duoFeaturesScore: 61,
      streakBonus: 61,
    }
    expect(calculateBondLevel(input).label).toBe('気になる存在')
  })

  it('returns label "気になる存在" for level 80 (boundary)', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 80,
      topicDiversityScore: 80,
      messageDepthScore: 80,
      duoFeaturesScore: 80,
      streakBonus: 80,
    }
    expect(calculateBondLevel(input).label).toBe('気になる存在')
  })

  it('returns label "深い関係" for level 81 (boundary)', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 81,
      topicDiversityScore: 81,
      messageDepthScore: 81,
      duoFeaturesScore: 81,
      streakBonus: 81,
    }
    expect(calculateBondLevel(input).label).toBe('深い関係')
  })

  it('returns label "深い関係" for level 100', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 100,
      topicDiversityScore: 100,
      messageDepthScore: 100,
      duoFeaturesScore: 100,
      streakBonus: 100,
    }
    expect(calculateBondLevel(input).label).toBe('深い関係')
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it('handles fractional input scores', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 50.5,
      topicDiversityScore: 50.5,
      messageDepthScore: 50.5,
      duoFeaturesScore: 50.5,
      streakBonus: 50.5,
    }
    // All equal → level = 50.5
    const result = calculateBondLevel(input)
    expect(result.level).toBeCloseTo(50.5, 5)
    expect(result.label).toBe('友達感覚')
  })

  it('applies weights correctly — replyConsistency has highest weight', () => {
    // Only replyConsistencyScore = 100, rest 0 → 100*0.3 = 30
    const input: BondScoreInput = {
      replyConsistencyScore: 100,
      topicDiversityScore: 0,
      messageDepthScore: 0,
      duoFeaturesScore: 0,
      streakBonus: 0,
    }
    expect(calculateBondLevel(input).level).toBeCloseTo(30, 5)
  })

  it('applies streakBonus weight correctly (lowest weight)', () => {
    // Only streakBonus = 100, rest 0 → 100*0.1 = 10
    const input: BondScoreInput = {
      replyConsistencyScore: 0,
      topicDiversityScore: 0,
      messageDepthScore: 0,
      duoFeaturesScore: 0,
      streakBonus: 100,
    }
    expect(calculateBondLevel(input).level).toBeCloseTo(10, 5)
  })

  it('returns both level and label in result', () => {
    const input: BondScoreInput = {
      replyConsistencyScore: 50,
      topicDiversityScore: 50,
      messageDepthScore: 50,
      duoFeaturesScore: 50,
      streakBonus: 50,
    }
    const result = calculateBondLevel(input)
    expect(result).toHaveProperty('level')
    expect(result).toHaveProperty('label')
  })
})
