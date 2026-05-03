'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import PartnerCard from '@/components/PartnerCard'
import { usePartnerList } from '@/hooks/usePartnerList'
import type { Partner } from '@/lib/types'

type FilterTab = 'all' | 'active' | 'stalled'

const TABS: { label: string; value: FilterTab }[] = [
  { label: 'すべて', value: 'all' },
  { label: '盛り上がり中', value: 'active' },
  { label: '停滞中', value: 'stalled' },
]

interface DashboardClientProps {
  initialPartners: Partner[]
}

async function fetchPartners(): Promise<Partner[]> {
  const res = await fetch('/api/partners')
  if (!res.ok) throw new Error('Failed to fetch partners')
  return res.json()
}

export default function DashboardClient({ initialPartners }: DashboardClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const { partners, isLoading } = usePartnerList(fetchPartners)

  // Use initial partners on first load, then switch to hook data
  const displayPartners = isLoading ? initialPartners : partners

  const filteredPartners = useMemo(() => {
    if (activeTab === 'all') return displayPartners
    if (activeTab === 'active') return displayPartners.filter((p) => p.streakDays > 0)
    return displayPartners.filter((p) => p.streakDays === 0)
  }, [displayPartners, activeTab])

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">マイ相手リスト</h1>
        <button
          type="button"
          onClick={() => router.push('/partners/new')}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          新しい相手を追加
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium',
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredPartners.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          相手が見つかりません
        </p>
      ) : (
        <div className="grid gap-3">
          {filteredPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onClick={() => router.push(`/partners/${partner.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
