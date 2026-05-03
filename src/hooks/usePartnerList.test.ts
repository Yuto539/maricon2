import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePartnerList } from './usePartnerList'
import type { Partner } from '@/lib/types'

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

describe('usePartnerList', () => {
  it('initially has isLoading=true and partners=[]', () => {
    const fetchPartners = vi.fn(() => new Promise<Partner[]>(() => {})) // never resolves
    const { result } = renderHook(() => usePartnerList(fetchPartners))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.partners).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets partners on successful fetch', async () => {
    const partners = [makePartner({ id: 'p1', nickname: '花子' })]
    const fetchPartners = vi.fn().mockResolvedValue(partners)
    const { result } = renderHook(() => usePartnerList(fetchPartners))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.partners).toEqual(partners)
    expect(result.current.error).toBeNull()
  })

  it('sets error on failed fetch', async () => {
    const fetchPartners = vi.fn().mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => usePartnerList(fetchPartners))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.error).toBe('Network error')
    expect(result.current.partners).toEqual([])
  })

  it('isLoading is false after fetch completes successfully', async () => {
    const fetchPartners = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => usePartnerList(fetchPartners))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('isLoading is false after fetch fails', async () => {
    const fetchPartners = vi.fn().mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => usePartnerList(fetchPartners))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('calling refetch triggers fetch again', async () => {
    const fetchPartners = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => usePartnerList(fetchPartners))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchPartners).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchPartners).toHaveBeenCalledTimes(2)
  })

  it('refetch updates partners after re-fetch', async () => {
    const firstPartners = [makePartner({ id: 'p1' })]
    const secondPartners = [makePartner({ id: 'p1' }), makePartner({ id: 'p2' })]

    const fetchPartners = vi
      .fn()
      .mockResolvedValueOnce(firstPartners)
      .mockResolvedValueOnce(secondPartners)

    const { result } = renderHook(() => usePartnerList(fetchPartners))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.partners).toHaveLength(1)

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.partners).toHaveLength(2)
    })
  })
})
