import { Flame } from 'lucide-react'

export interface StreakDisplayProps {
  streakDays: number
  isActiveToday: boolean
}

export default function StreakDisplay({ streakDays, isActiveToday }: StreakDisplayProps) {
  if (streakDays === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>まだ記録がありません</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Flame
        data-testid="flame-icon"
        data-active={String(isActiveToday)}
        size={18}
        className={isActiveToday ? 'text-amber-500' : 'text-gray-400'}
      />
      <span className="text-sm font-medium">{streakDays}日継続中</span>
    </div>
  )
}
