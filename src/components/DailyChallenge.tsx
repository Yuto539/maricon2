import { Check } from 'lucide-react'

export interface DailyChallengeProps {
  challenge: {
    id: string
    challengeText: string
    completed: boolean
  } | null
  onComplete: (id: string) => void
}

export default function DailyChallenge({ challenge, onComplete }: DailyChallengeProps) {
  if (!challenge) {
    return (
      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        今日のチャレンジはありません
      </div>
    )
  }

  if (challenge.completed) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="mb-2 text-sm">{challenge.challengeText}</p>
        <div className="flex items-center gap-1 text-green-700 text-sm font-medium">
          <Check data-testid="check-icon" size={16} />
          <span>達成済み</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4">
      <p className="mb-3 text-sm">{challenge.challengeText}</p>
      <button
        type="button"
        onClick={() => onComplete(challenge.id)}
        className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        達成する
      </button>
    </div>
  )
}
