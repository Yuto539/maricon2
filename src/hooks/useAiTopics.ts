'use client'

import { useState, useCallback } from 'react'
import type { SceneType } from '@/lib/types'

export interface AiTopic {
  id: string
  text: string
  category: string
  depth: 'light' | 'medium' | 'deep'
}

export interface UseAiTopicsResult {
  topics: AiTopic[]
  isLoading: boolean
  error: string | null
  remaining: number | null
  fetchTopics: (partnerId: string, sceneType: SceneType) => Promise<void>
}

export function useAiTopics(
  postTopics: (body: { partnerId: string; sceneType: SceneType }) => Promise<{
    topics: AiTopic[]
    remaining: number
  }>,
): UseAiTopicsResult {
  const [topics, setTopics] = useState<AiTopic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const fetchTopics = useCallback(
    async (partnerId: string, sceneType: SceneType) => {
      setIsLoading(true)
      setError(null)
      setTopics([])

      try {
        const result = await postTopics({ partnerId, sceneType })
        setTopics(result.topics)
        setRemaining(result.remaining)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    },
    [postTopics],
  )

  return { topics, isLoading, error, remaining, fetchTopics }
}
