'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MessageList from '@/components/MessageList'
import ConversationInput from '@/components/ConversationInput'
import BondLevelGauge from '@/components/BondLevelGauge'
import StreakDisplay from '@/components/StreakDisplay'
import BadgeGrid from '@/components/BadgeGrid'
import DailyChallenge from '@/components/DailyChallenge'
import AiDrawer from '@/components/AiDrawer'
import { usePartnerDetail } from '@/hooks/usePartnerDetail'
import { useAiTopics } from '@/hooks/useAiTopics'
import type { Partner, Message } from '@/lib/types'
import type { GamificationData } from '@/hooks/usePartnerDetail'

type Tab = 'chat' | 'profile' | 'progress' | 'notes'

const TABS: { label: string; value: Tab }[] = [
  { label: '会話', value: 'chat' },
  { label: 'プロフィール', value: 'profile' },
  { label: '進捗', value: 'progress' },
  { label: 'メモ', value: 'notes' },
]

async function fetchPartner(id: string): Promise<Partner | null> {
  const res = await fetch(`/api/partners/${id}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchMessages(partnerId: string): Promise<Message[]> {
  const res = await fetch(`/api/partners/${partnerId}/messages`)
  if (!res.ok) return []
  return res.json()
}

async function fetchGamification(partnerId: string): Promise<GamificationData> {
  const res = await fetch(`/api/gamification/${partnerId}`)
  if (!res.ok) throw new Error('Failed to fetch gamification')
  return res.json()
}

async function createMessage(msg: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
  const res = await fetch(`/api/partners/${msg.partnerId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg),
  })
  if (!res.ok) throw new Error('Failed to create message')
  return res.json()
}

async function postTopics(body: { partnerId: string; sceneType: string }) {
  const res = await fetch('/api/ai/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

interface Props {
  params: Promise<{ id: string }>
}

export default function PartnerDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)

  const deps = {
    fetchPartner,
    fetchMessages,
    fetchGamification,
    createMessage,
  }

  const { partner, messages, gamification, isLoading, error, addMessage } =
    usePartnerDetail(id, deps)

  const { topics, isLoading: topicsLoading, error: topicsError, fetchTopics } =
    useAiTopics(postTopics)

  const latestPartnerMessage = messages
    .filter((m) => m.sender === 'partner')
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0]?.content

  const handleAddMessage = useCallback(
    (msg: { sender: 'me' | 'partner'; content: string }) => {
      addMessage(msg)
    },
    [addMessage],
  )

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">読み込み中...</div>
  }

  if (error || !partner) {
    return (
      <div className="p-4">
        <p className="text-destructive">{error ?? 'パートナーが見つかりませんでした'}</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-2 text-sm text-primary underline"
        >
          ダッシュボードへ戻る
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; 戻る
        </button>
        <h1 className="text-xl font-bold text-foreground">{partner.nickname}</h1>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={[
              'px-3 py-2 text-sm font-medium',
              activeTab === tab.value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col gap-4">
          <MessageList messages={messages} partnerNickname={partner.nickname} />
          <ConversationInput onSubmit={handleAddMessage} />
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="fixed bottom-4 right-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
          >
            AI提案
          </button>
        </div>
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="flex flex-col gap-3 text-sm">
          {partner.age && (
            <div>
              <span className="font-medium">年齢: </span>
              <span>{partner.age}歳</span>
            </div>
          )}
          {partner.occupation && (
            <div>
              <span className="font-medium">職業: </span>
              <span>{partner.occupation}</span>
            </div>
          )}
          {partner.metVia && (
            <div>
              <span className="font-medium">出会い: </span>
              <span>{partner.metVia}</span>
            </div>
          )}
          {partner.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {partner.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress tab */}
      {activeTab === 'progress' && gamification && (
        <div className="flex flex-col gap-4">
          <BondLevelGauge bondLevel={gamification.bondLevel} />
          <StreakDisplay streakDays={gamification.streakDays} isActiveToday={gamification.streakDays > 0} />
          <BadgeGrid badges={gamification.badges} />
          {gamification.dailyChallenge && (
            <DailyChallenge challenge={gamification.dailyChallenge} onComplete={() => {}} />
          )}
        </div>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="text-sm text-muted-foreground">
          {partner.profileNotes ?? 'メモはありません'}
        </div>
      )}

      {/* AI Drawer */}
      <AiDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        partnerId={partner.id}
        partnerNickname={partner.nickname}
        latestMessage={latestPartnerMessage}
        isLoading={topicsLoading}
        error={topicsError ?? undefined}
      />
    </div>
  )
}
