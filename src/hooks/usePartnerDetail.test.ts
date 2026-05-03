import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePartnerDetail } from './usePartnerDetail'
import type { Partner, Message, Badge } from '@/lib/types'

const makePartner = (overrides: Partial<Partner> = {}): Partner => ({
  id: 'partner-1',
  userId: 'user-1',
  nickname: '花子',
  tags: [],
  status: 'active',
  bondLevel: 50,
  streakDays: 3,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  partnerId: 'partner-1',
  sender: 'me',
  content: 'こんにちは',
  sentAt: '2026-01-01T10:00:00Z',
  createdAt: '2026-01-01T10:00:00Z',
  ...overrides,
})

const makeGamification = () => ({
  bondLevel: 50,
  bondLevelLabel: '友達感覚',
  streakDays: 3,
  healthScore: { score: 75, breakdown: { frequency: 80, depth: 70 }, trend: 'stable' },
  badges: [] as Badge[],
  dailyChallenge: null,
})

const makeDeps = (overrides: Partial<ReturnType<typeof makeDefaultDeps>> = {}) => {
  return { ...makeDefaultDeps(), ...overrides }
}

function makeDefaultDeps() {
  return {
    fetchPartner: vi.fn().mockResolvedValue(makePartner()),
    fetchMessages: vi.fn().mockResolvedValue([makeMessage()]),
    fetchGamification: vi.fn().mockResolvedValue(makeGamification()),
    createMessage: vi.fn().mockResolvedValue(makeMessage({ id: 'msg-new' })),
  }
}

describe('usePartnerDetail', () => {
  it('initially has isLoading=true', () => {
    const deps = {
      fetchPartner: vi.fn(() => new Promise<Partner | null>(() => {})),
      fetchMessages: vi.fn(() => new Promise<Message[]>(() => {})),
      fetchGamification: vi.fn(() => new Promise<ReturnType<typeof makeGamification>>(() => {})),
      createMessage: vi.fn(),
    }
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.partner).toBeNull()
    expect(result.current.messages).toEqual([])
  })

  it('sets partner and messages on successful load', async () => {
    const deps = makeDeps()
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.partner).toEqual(makePartner())
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetchPartner returns null', async () => {
    const deps = makeDeps({
      fetchPartner: vi.fn().mockResolvedValue(null),
    })
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.partner).toBeNull()
  })

  it('sets error when fetchPartner rejects', async () => {
    const deps = makeDeps({
      fetchPartner: vi.fn().mockRejectedValue(new Error('fetch failed')),
    })
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeTruthy()
  })

  it('sets gamification data on successful load', async () => {
    const deps = makeDeps()
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.gamification).not.toBeNull()
    expect(result.current.gamification?.bondLevel).toBe(50)
  })

  it('addMessage calls createMessage with correct partnerId', async () => {
    const createMessage = vi.fn().mockResolvedValue(makeMessage({ id: 'new-msg' }))
    const deps = makeDeps({ createMessage })
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addMessage({ sender: 'me', content: 'こんにちは' })
    })

    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: 'partner-1',
        sender: 'me',
        content: 'こんにちは',
      }),
    )
  })

  it('addMessage refetches messages after creating', async () => {
    const initialMessages = [makeMessage({ id: 'msg-1' })]
    const updatedMessages = [makeMessage({ id: 'msg-1' }), makeMessage({ id: 'msg-2' })]
    const fetchMessages = vi
      .fn()
      .mockResolvedValueOnce(initialMessages)
      .mockResolvedValueOnce(updatedMessages)

    const deps = makeDeps({ fetchMessages })
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.messages).toHaveLength(1)

    await act(async () => {
      await result.current.addMessage({ sender: 'partner', content: 'こんにちは' })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })
  })

  it('refetch re-fetches partner and messages', async () => {
    const deps = makeDeps()
    const { result } = renderHook(() => usePartnerDetail('partner-1', deps))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const initialFetchCount = deps.fetchPartner.mock.calls.length

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(deps.fetchPartner.mock.calls.length).toBeGreaterThan(initialFetchCount)
    })
  })
})
