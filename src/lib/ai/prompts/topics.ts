export interface PartnerProfile {
  nickname: string
  age?: number
  occupation?: string
  tags: string[]
  profileNotes?: string
}

export interface RecentMessage {
  sender: 'me' | 'partner'
  content: string
  sentAt: string
}

export type SceneType =
  | 'morning'
  | 'evening'
  | 'weekend'
  | 'after_date'
  | 'general'

export interface TopicPromptInput {
  partner: PartnerProfile
  recentMessages: RecentMessage[]
  sceneType: SceneType
}

export interface BuiltPrompt {
  systemPrompt: string
  userPrompt: string
}

const SCENE_LABEL: Record<SceneType, string> = {
  morning: '朝',
  evening: '夜',
  weekend: '週末',
  after_date: 'デートの後',
  general: '（シーンは特に指定なし）',
}

export function buildTopicPrompt(input: TopicPromptInput): BuiltPrompt {
  const systemPrompt = [
    'あなたは婚活のテキストコミュニケーション専門家です。',
    'ユーザーが相手との会話を弾ませるために、話題の提案を行います。',
    '返答は必ず以下のJSON配列フォーマットで、ちょうど3つの話題提案を返してください。',
    '例: ["話題1", "話題2", "話題3"]',
    '余計な説明文は不要です。JSON配列のみを返してください。',
  ].join('\n')

  const lines: string[] = []

  lines.push(`相手のニックネーム: ${input.partner.nickname}`)

  if (input.partner.age !== undefined) {
    lines.push(`年齢: ${input.partner.age}歳`)
  }

  if (input.partner.occupation) {
    lines.push(`職業: ${input.partner.occupation}`)
  }

  if (input.partner.tags.length > 0) {
    lines.push(`趣味・特徴: ${input.partner.tags.join('、')}`)
  }

  if (input.partner.profileNotes) {
    lines.push(`メモ: ${input.partner.profileNotes}`)
  }

  lines.push(`シーン: ${SCENE_LABEL[input.sceneType]}`)

  const lastMessages = input.recentMessages.slice(-3)
  if (lastMessages.length > 0) {
    lines.push('最近のやり取り（最新3件）:')
    for (const msg of lastMessages) {
      const who = msg.sender === 'me' ? '自分' : '相手'
      lines.push(`  ${who}: ${msg.content}`)
    }
  }

  lines.push('上記を踏まえて、自然な会話のきっかけになる話題を3つ提案してください。')

  const userPrompt = lines.join('\n')

  return { systemPrompt, userPrompt }
}
