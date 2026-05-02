import { describe, it, expect } from 'vitest'
import { buildReplyPrompt, type ReplyPromptInput } from './replies'
import type { PartnerProfile } from './topics'

// ── Fixtures ────────────────────────────────────────────────────────────────

const basePartner: PartnerProfile = {
  nickname: 'ミオ',
  tags: ['読書好き'],
}

function makeInput(overrides: Partial<ReplyPromptInput> = {}): ReplyPromptInput {
  return {
    partner: basePartner,
    latestMessage: '今日は何してたの？',
    replyTone: 'casual',
    replyType: 'expand',
    ...overrides,
  }
}

// ── System prompt — tone rules ─────────────────────────────────────────────

describe('buildReplyPrompt — systemPrompt tone', () => {
  it('includes フランクなトーン for casual tone', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput({ replyTone: 'casual' }))
    expect(systemPrompt).toContain('フランクなトーン')
  })

  it('includes 丁寧なトーン for polite tone', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput({ replyTone: 'polite' }))
    expect(systemPrompt).toContain('丁寧なトーン')
  })

  it('includes 甘めのトーン for sweet tone', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput({ replyTone: 'sweet' }))
    expect(systemPrompt).toContain('甘めのトーン')
  })
})

// ── System prompt — reply type rules ──────────────────────────────────────

describe('buildReplyPrompt — systemPrompt reply type', () => {
  it('includes 会話を広げる返信 for expand type', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput({ replyType: 'expand' }))
    expect(systemPrompt).toContain('会話を広げる返信')
  })

  it('includes 会話を穏やかに締める返信 for close type', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput({ replyType: 'close' }))
    expect(systemPrompt).toContain('会話を穏やかに締める返信')
  })

  it('includes 質問で返す返信 for question type', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput({ replyType: 'question' }))
    expect(systemPrompt).toContain('質問で返す返信')
  })
})

// ── System prompt — format rules ───────────────────────────────────────────

describe('buildReplyPrompt — systemPrompt format', () => {
  it('instructs to return JSON with a reply field', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput())
    expect(systemPrompt.toLowerCase()).toMatch(/json/)
    expect(systemPrompt).toContain('reply')
  })

  it('does not contain emoji characters', () => {
    const { systemPrompt } = buildReplyPrompt(makeInput())
    const emojiRegex =
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/u
    expect(emojiRegex.test(systemPrompt)).toBe(false)
  })
})

// ── User prompt rules ──────────────────────────────────────────────────────

describe('buildReplyPrompt — userPrompt', () => {
  it('includes the latestMessage in user prompt', () => {
    const { userPrompt } = buildReplyPrompt(
      makeInput({ latestMessage: '週末どこか行く？' }),
    )
    expect(userPrompt).toContain('週末どこか行く？')
  })

  it('includes partner nickname in user prompt', () => {
    const { userPrompt } = buildReplyPrompt(makeInput())
    expect(userPrompt).toContain('ミオ')
  })

  it('includes partner tags when present', () => {
    const { userPrompt } = buildReplyPrompt(
      makeInput({ partner: { ...basePartner, tags: ['音楽好き', 'カフェ巡り'] } }),
    )
    expect(userPrompt).toContain('音楽好き')
  })

  it('does not crash when tags are empty', () => {
    expect(() =>
      buildReplyPrompt(
        makeInput({ partner: { ...basePartner, tags: [] } }),
      ),
    ).not.toThrow()
  })

  it('includes occupation when provided', () => {
    const { userPrompt } = buildReplyPrompt(
      makeInput({ partner: { ...basePartner, occupation: 'デザイナー' } }),
    )
    expect(userPrompt).toContain('デザイナー')
  })

  it('includes profileNotes when provided', () => {
    const { userPrompt } = buildReplyPrompt(
      makeInput({ partner: { ...basePartner, profileNotes: '犬が好きらしい' } }),
    )
    expect(userPrompt).toContain('犬が好きらしい')
  })

  it('handles very long latestMessage without throwing', () => {
    const longMessage = 'あ'.repeat(1000)
    expect(() =>
      buildReplyPrompt(makeInput({ latestMessage: longMessage })),
    ).not.toThrow()
  })
})

// ── Return shape ───────────────────────────────────────────────────────────

describe('buildReplyPrompt — return shape', () => {
  it('returns an object with systemPrompt and userPrompt strings', () => {
    const result = buildReplyPrompt(makeInput())
    expect(typeof result.systemPrompt).toBe('string')
    expect(typeof result.userPrompt).toBe('string')
    expect(result.systemPrompt.length).toBeGreaterThan(0)
    expect(result.userPrompt.length).toBeGreaterThan(0)
  })
})
