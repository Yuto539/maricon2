'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Partner } from '@/lib/types'

export interface UsePartnerListResult {
  partners: Partner[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function usePartnerList(
  fetchPartners: () => Promise<Partner[]>,
): UsePartnerListResult {
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchPartners()
      .then((data) => {
        if (!cancelled) {
          setPartners(data)
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
  }, [fetchPartners, tick])

  const refetch = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  return { partners, isLoading, error, refetch }
}
