import { TrendingUp, TrendingDown } from 'lucide-react'
import { getBondLevelLabel } from '@/lib/gamification/bond'

export interface BondLevelGaugeProps {
  bondLevel: number
  previousLevel?: number
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: { svgSize: 64, strokeWidth: 6, fontSize: '0.6rem' },
  md: { svgSize: 96, strokeWidth: 8, fontSize: '0.75rem' },
  lg: { svgSize: 128, strokeWidth: 10, fontSize: '1rem' },
}

function getBondColor(level: number): string {
  if (level >= 81) return '#A0614F'
  if (level >= 61) return '#B07D6A'
  if (level >= 41) return '#C19B8A'
  if (level >= 21) return '#C4B09A'
  return '#D4CFC8'
}

export default function BondLevelGauge({ bondLevel, previousLevel, size = 'md' }: BondLevelGaugeProps) {
  const { svgSize, strokeWidth, fontSize } = SIZE_MAP[size]
  const radius = (svgSize - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, bondLevel))
  const dashOffset = circumference - (progress / 100) * circumference
  const color = getBondColor(bondLevel)
  const label = getBondLevelLabel(bondLevel)
  const cx = svgSize / 2
  const cy = svgSize / 2

  const showTrend = previousLevel !== undefined && bondLevel !== previousLevel
  const isRising = previousLevel !== undefined && bondLevel > previousLevel

  return (
    <div data-testid="bond-gauge-container" data-size={size} className="flex flex-col items-center gap-1">
      <svg
        data-testid="bond-gauge-svg"
        data-color={color}
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#E5E0DA"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Center label */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize, fill: '#3D2B1F' }}
        >
          {label}
        </text>
      </svg>

      {showTrend && (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          {isRising ? (
            <>
              <TrendingUp size={12} />
              上昇傾向
            </>
          ) : (
            <>
              <TrendingDown size={12} />
              下降傾向
            </>
          )}
        </span>
      )}
    </div>
  )
}
