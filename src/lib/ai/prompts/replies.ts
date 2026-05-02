import type { PartnerProfile, BuiltPrompt } from './topics'

export type ReplyTone = 'casual' | 'polite' | 'sweet'
export type ReplyType = 'expand' | 'close' | 'question'

export interface ReplyPromptInput {
  partner: PartnerProfile
  latestMessage: string
  replyTone: ReplyTone
  replyType: ReplyType
}

const TONE_LABEL: Record<ReplyTone, string> = {
  casual: 'フランクなトーン',
  polite: '丁寧なトーン',
  sweet: '甘めのトーン',
}

const REPLY_TYPE_LABEL: Record<ReplyType, string> = {
  expand: '会話を広げる返信',
  close: '会話を穏やかに締める返信',
  question: '質問で返す返信',
}

export function buildReplyPrompt(input: ReplyPromptInput): BuiltPrompt {
  const systemPrompt = [
    'あなたは婚活のテキストコミュニケーション専門家です。',
    `トーン: ${TONE_LABEL[input.replyTone]}`,
    `返信スタイル: ${REPLY_TYPE_LABEL[input.replyType]}`,
    '以下のメッセージに対する返信を1つ生成してください。',
    '返答は必ず次のJSONフォーマットで返してください: { "reply": "返信テキスト" }',
    '余計な説明文は不要です。JSONのみを返してください。',
  ].join('\n')

  const lines: string[] = []

  lines.push(`相手のニックネーム: ${input.partner.nickname}`)

  if (input.partner.tags.length > 0) {
    lines.push(`趣味・特徴: ${input.partner.tags.join('、')}`)
  }

  if (input.partner.occupation) {
    lines.push(`職業: ${input.partner.occupation}`)
  }

  if (input.partner.profileNotes) {
    lines.push(`メモ: ${input.partner.profileNotes}`)
  }

  lines.push(`相手からの最新メッセージ: ${input.latestMessage}`)
  lines.push('このメッセージへの返信を生成してください。')

  const userPrompt = lines.join('\n')

  return { systemPrompt, userPrompt }
}
