/**
 * Returns a Japanese relative time string for a given ISO date string.
 * @param isoString - ISO 8601 date string
 * @param now - optional reference date (defaults to current time)
 */
export function relativeTime(isoString: string, now?: Date): string {
  const reference = now ?? new Date()
  const past = new Date(isoString)
  const diffMs = reference.getTime() - past.getTime()

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffSeconds < 60) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  return `${diffWeeks}週間前`
}
