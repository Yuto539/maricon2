import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAiTopics } from './useAiTopics'
import type { SceneType } from '@/lib/types'

interface AiTopic {
  id: string
  text: string
  category: string
  depth: 'light' | 'medium' | 'deep'
}

const makeTopic = (overrides: Partial<AiTopic> = {}): AiTopic => ({
  id: 'topic-1',
  text: '最近ハマっていること',
  category: 'lifestyle',
  depth: 'light',
  ...overrides,
})

const makePostTopics = (
  result: { topics: AiTopic[]; remaining: number } = { topics: [makeTopic()], remaining: 4 },
) => vi.fn().mockResolvedValue(result)

describe('useAiTopics', () => {
  it('initially has topics=[], isLoading=false, error=null, remaining=null', () => {
    const postTopics = makePostTopics()
    const { result } = renderHook(() => useAiTopics(postTopics))
    expect(result.current.topics).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.remaining).toBeNull()
  })

  it('sets isLoading=true while fetching', async () => {
    let resolvePromise!: (value: { topics: AiTopic[]; remaining: number }) => void
    const postTopics = vi.fn(
      () =>
        new Promise<{ topics: AiTopic[]; remaining: number }>((resolve) => {
          resolvePromise = resolve
        }),
    )

    const { result } = renderHook(() => useAiTopics(postTopics))

    act(() => {
      result.current.fetchTopics('partner-1', 'general')
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise({ topics: [makeTopic()], remaining: 3 })
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('sets topics and remaining on success', async () => {
    const topics = [makeTopic({ id: 't1' }), makeTopic({ id: 't2', depth: 'deep' })]
    const postTopics = vi.fn().mockResolvedValue({ topics, remaining: 2 })

    const { result } = renderHook(() => useAiTopics(postTopics))

    await act(async () => {
      await result.current.fetchTopics('partner-1', 'morning')
    })

    expect(result.current.topics).toEqual(topics)
    expect(result.current.remaining).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    const postTopics = vi.fn().mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useAiTopics(postTopics))

    await act(async () => {
      await result.current.fetchTopics('partner-1', 'evening')
    })

    expect(result.current.error).toBe('API error')
    expect(result.current.topics).toEqual([])
  })

  it('isLoading is false after fetch completes successfully', async () => {
    const postTopics = makePostTopics()
    const { result } = renderHook(() => useAiTopics(postTopics))

    await act(async () => {
      await result.current.fetchTopics('partner-1', 'general')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('isLoading is false after fetch fails', async () => {
    const postTopics = vi.fn().mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useAiTopics(postTopics))

    await act(async () => {
      await result.current.fetchTopics('partner-1', 'weekend')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('clears previous topics when fetching new ones', async () => {
    const firstTopics = [makeTopic({ id: 't1', text: '古い話題' })]
    const secondTopics = [makeTopic({ id: 't2', text: '新しい話題' })]

    const postTopics = vi
      .fn()
      .mockResolvedValueOnce({ topics: firstTopics, remaining: 3 })
      .mockResolvedValueOnce({ topics: secondTopics, remaining: 2 })

    const { result } = renderHook(() => useAiTopics(postTopics))

    await act(async () => {
      await result.current.fetchTopics('partner-1', 'general')
    })
    expect(result.current.topics).toHaveLength(1)
    expect(result.current.topics[0].text).toBe('古い話題')

    await act(async () => {
      await result.current.fetchTopics('partner-1', 'morning')
    })
    expect(result.current.topics).toHaveLength(1)
    expect(result.current.topics[0].text).toBe('新しい話題')
  })

  it('calls postTopics with correct partnerId and sceneType', async () => {
    const postTopics = makePostTopics()
    const { result } = renderHook(() => useAiTopics(postTopics))

    await act(async () => {
      await result.current.fetchTopics('partner-42', 'after_date')
    })

    expect(postTopics).toHaveBeenCalledWith({
      partnerId: 'partner-42',
      sceneType: 'after_date',
    })
  })
})
