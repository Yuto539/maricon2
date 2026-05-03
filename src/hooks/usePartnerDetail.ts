'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Partner, Message, Badge } from '@/lib/types'

export interface GamificationData {
  bondLevel: number
  bondLevelLabel: string
  streakDays: number
  healthScore: { score: number; breakdown: Record<string, number>; trend: string }
  badges: Badge[]
  dailyChallenge: { id: string; challengeText: string; completed: boolean } | null
}

export interface UsePartnerDetailResult {
  partner: Partner | null
  messages: Message[]
  gamification: GamificationData | null
  isLoading: boolean
  error: string | null
  addMessage: (msg: { sender: 'me' | 'partner'; content: string }) => Promise<void>
  refetch: () => void
}

interface Deps {
  fetchPartner: (id: string) => Promise<Partner | null>
  fetchMessages: (partnerId: string) => Promise<Message[]>
  fetchGamification: (partnerId: string) => Promise<GamificationData>
  createMessage: (msg: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>
}

export function usePartnerDetail(
  partnerId: string,
  deps: Deps,
): UsePartnerDetailResult {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [gamification, setGamification] = useState<GamificationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const { fetchPartner, fetchMessages, fetchGamification } = deps

  const loadMessages = useCallback(async () => {
    const msgs = await fetchMessages(partnerId)
    setMessages(msgs)
  }, [fetchMessages, partnerId])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      fetchPartner(partnerId),
      fetchMessages(partnerId),
      fetchGamification(partnerId),
    ])
      .then(([partnerData, messagesData, gamificationData]) => {
        if (!cancelled) {
          if (partnerData === null) {
            setError('パートナーが見つかりませんでした')
            setIsLoading(false)
            return
          }
          setPartner(partnerData)
          setMessages(messagesData)
          setGamification(gamificationData)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [fetchPartner, fetchMessages, fetchGamification, partnerId, tick])

  const addMessage = useCallback(
    async (msg: { sender: 'me' | 'partner'; content: string }) => {
      await deps.createMessage({
        partnerId,
        sender: msg.sender,
        content: msg.content,
        sentAt: new Date().toISOString(),
      })
      await loadMessages()
    },
    [deps, partnerId, loadMessages],
  )

  const refetch = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  return { partner, messages, gamification, isLoading, error, addMessage, refetch }
}
