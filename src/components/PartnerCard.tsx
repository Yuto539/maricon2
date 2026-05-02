import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import BondLevelGauge from './BondLevelGauge'
import { relativeTime } from '@/lib/utils/relativeTime'

export interface PartnerCardProps {
  partner: {
    id: string
    nickname: string
    metVia?: string
    bondLevel: number
    streakDays: number
    lastContactAt?: string
    status: 'active' | 'paused' | 'ended'
  }
  healthTrend?: 'improving' | 'stable' | 'declining'
  onClick?: () => void
}

const HEALTH_TREND_CONFIG = {
  improving: { label: '盛り上がり中', Icon: TrendingUp },
  stable: { label: '安定', Icon: Minus },
  declining: { label: '停滞気味', Icon: TrendingDown },
} as const

export default function PartnerCard({ partner, healthTrend, onClick }: PartnerCardProps) {
  const trendConfig = healthTrend ? HEALTH_TREND_CONFIG[healthTrend] : null

  return (
    <div
      data-testid="partner-card"
      onClick={onClick}
      className={[
        'relative cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md',
        'bg-card border border-border',
        partner.status === 'ended' ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* Ended badge */}
      {partner.status === 'ended' && (
        <span className="absolute right-3 top-3 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          終了
        </span>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-foreground">{partner.nickname}</h3>
          {partner.metVia && (
            <span data-testid="partner-metvia" className="text-xs text-muted-foreground">
              {partner.metVia}
            </span>
          )}
        </div>
        <BondLevelGauge bondLevel={partner.bondLevel} size="sm" />
      </div>

      {/* Streak */}
      <div className="mt-2 text-sm text-muted-foreground">
        {partner.streakDays > 0 ? `${partner.streakDays}日継続中` : '記録なし'}
      </div>

      {/* Health trend */}
      {trendConfig && (
        <div data-testid="health-trend" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <trendConfig.Icon size={12} />
          <span>{trendConfig.label}</span>
        </div>
      )}

      {/* Last contact */}
      {partner.lastContactAt && (
        <div data-testid="last-contact-time" className="mt-1 text-xs text-muted-foreground">
          {relativeTime(partner.lastContactAt)}
        </div>
      )}
    </div>
  )
}
