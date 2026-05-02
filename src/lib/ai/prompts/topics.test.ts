import { describe, it, expect } from 'vitest'
import { buildTopicPrompt, type TopicPromptInput, type PartnerProfile } from './topics'

// ── Fixtures ────────────────────────────────────────────────────────────────

const basePartner: PartnerProfile = {
  nickname: 'サクラ',
  tags: ['映画好き', 'アウトドア派'],
}

function makeInput(overrides: Partial<TopicPromptInput> = {}): TopicPromptInput {
  return {
    partner: basePartner,
    recentMessages: [],
    sceneType: 'general',
    ...overrides,
  }
}

// ── System prompt rules ────────────────────────────────────────────────────

describe('buildTopicPrompt — systemPrompt', () => {
  it('includes the expert role keyword', () => {
    const { systemPrompt } = buildTopicPrompt(makeInput())
    expect(systemPrompt).toContain('婚活のテキストコミュニケーション専門家')
  })

  it('instructs to return exactly 3 topic suggestions', () => {
    const { systemPrompt } = buildTopicPrompt(makeInput())
    expect(systemPrompt).toContain('3')
  })

  it('instructs to return a JSON array', () => {
    const { systemPrompt } = buildTopicPrompt(makeInput())
    // Accept any mention of JSON array format
    expect(systemPrompt.toLowerCase()).toMatch(/json/)
  })

  it('does not contain emoji characters', () => {
    const { systemPrompt } = buildTopicPrompt(makeInput())
    // Emoji code-point range: U+1F000 and above, and U+2600–U+27BF common emoji
    const emojiRegex =
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/u
    expect(emojiRegex.test(systemPrompt)).toBe(false)
  })
})

// ── User prompt rules ──────────────────────────────────────────────────────

describe('buildTopicPrompt — userPrompt', () => {
  it('includes the partner nickname', () => {
    const { userPrompt } = buildTopicPrompt(makeInput())
    expect(userPrompt).toContain('サクラ')
  })

  it('includes partner tags when present', () => {
    const { userPrompt } = buildTopicPrompt(
      makeInput({ partner: { ...basePartner, tags: ['映画好き', 'アウトドア派'] } }),
    )
    expect(userPrompt).toContain('映画好き')
    expect(userPrompt).toContain('アウトドア派')
  })

  it('does not crash when tags array is empty', () => {
    expect(() =>
      buildTopicPrompt(makeInput({ partner: { ...basePartner, tags: [] } })),
    ).not.toThrow()
  })

  // Scene type mapping
  it('includes 朝 for morning scene', () => {
    const { userPrompt } = buildTopicPrompt(makeInput({ sceneType: 'morning' }))
    expect(userPrompt).toContain('朝')
  })

  it('includes 夜 for evening scene', () => {
    const { userPrompt } = buildTopicPrompt(makeInput({ sceneType: 'evening' }))
    expect(userPrompt).toContain('夜')
  })

  it('includes 週末 for weekend scene', () => {
    const { userPrompt } = buildTopicPrompt(makeInput({ sceneType: 'weekend' }))
    expect(userPrompt).toContain('週末')
  })

  it('includes デートの後 for after_date scene', () => {
    const { userPrompt } = buildTopicPrompt(makeInput({ sceneType: 'after_date' }))
    expect(userPrompt).toContain('デートの後')
  })

  it('includes シーンは特に指定なし for general scene', () => {
    const { userPrompt } = buildTopicPrompt(makeInput({ sceneType: 'general' }))
    expect(userPrompt).toContain('シーンは特に指定なし')
  })

  // Recent messages
  it('does not crash with empty recentMessages', () => {
    expect(() =>
      buildTopicPrompt(makeInput({ recentMessages: [] })),
    ).not.toThrow()
  })

  it('includes recent message content when messages are provided', () => {
    const input = makeInput({
      recentMessages: [
        { sender: 'me', content: '今日は楽しかったね', sentAt: '2026-05-02T10:00:00Z' },
        { sender: 'partner', content: 'またいきましょう！', sentAt: '2026-05-02T10:01:00Z' },
      ],
    })
    const { userPrompt } = buildTopicPrompt(input)
    expect(userPrompt).toContain('今日は楽しかったね')
    expect(userPrompt).toContain('またいきましょう！')
  })

  it('includes at most the last 3 messages when more are provided', () => {
    const messages = [
      { sender: 'me' as const, content: 'メッセージ1', sentAt: '2026-05-02T09:00:00Z' },
      { sender: 'partner' as const, content: 'メッセージ2', sentAt: '2026-05-02T09:10:00Z' },
      { sender: 'me' as const, content: 'メッセージ3', sentAt: '2026-05-02T09:20:00Z' },
      { sender: 'partner' as const, content: 'メッセージ4', sentAt: '2026-05-02T09:30:00Z' },
    ]
    const { userPrompt } = buildTopicPrompt(makeInput({ recentMessages: messages }))
    // last 3 should appear
    expect(userPrompt).toContain('メッセージ2')
    expect(userPrompt).toContain('メッセージ3')
    expect(userPrompt).toContain('メッセージ4')
    // first message (oldest) should NOT appear
    expect(userPrompt).not.toContain('メッセージ1')
  })

  // Optional profile fields
  it('includes occupation when provided', () => {
    const input = makeInput({
      partner: { ...basePartner, occupation: 'エンジニア' },
    })
    const { userPrompt } = buildTopicPrompt(input)
    expect(userPrompt).toContain('エンジニア')
  })

  it('includes profileNotes when provided', () => {
    const input = makeInput({
      partner: { ...basePartner, profileNotes: '猫が好きらしい' },
    })
    const { userPrompt } = buildTopicPrompt(input)
    expect(userPrompt).toContain('猫が好きらしい')
  })

  it('does not crash when optional profile fields are absent', () => {
    expect(() =>
      buildTopicPrompt(
        makeInput({ partner: { nickname: 'ハナ', tags: [] } }),
      ),
    ).not.toThrow()
  })
})

// ── Return shape ───────────────────────────────────────────────────────────

describe('buildTopicPrompt — return shape', () => {
  it('returns an object with systemPrompt and userPrompt strings', () => {
    const result = buildTopicPrompt(makeInput())
    expect(typeof result.systemPrompt).toBe('string')
    expect(typeof result.userPrompt).toBe('string')
    expect(result.systemPrompt.length).toBeGreaterThan(0)
    expect(result.userPrompt.length).toBeGreaterThan(0)
  })
})
