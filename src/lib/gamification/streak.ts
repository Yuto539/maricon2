export interface StreakResult {
  streakDays: number
  isActiveToday: boolean
}

/**
 * Extract the calendar date portion (YYYY-MM-DD) from an ISO string.
 * Handles both plain dates and datetime strings.
 */
function toCalendarDate(isoString: string): string {
  return isoString.split('T')[0].substring(0, 10)
}

/**
 * Computes the number of milliseconds between two calendar-date strings.
 * Returns positive if b > a.
 */
function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000
  return (new Date(b).getTime() - new Date(a).getTime()) / msPerDay
}

/**
 * calculateStreak
 *
 * @param dates  - ISO date/datetime strings of conversation log entries
 * @param today  - The reference "today" date (YYYY-MM-DD). Defaults to system date.
 *                 Accept this as an injected parameter for testability.
 */
export function calculateStreak(
  dates: string[],
  today?: string,
): StreakResult {
  const todayStr = today ?? new Date().toISOString().split('T')[0]

  if (dates.length === 0) {
    return { streakDays: 0, isActiveToday: false }
  }

  // Normalise to calendar dates, deduplicate, filter future dates, sort descending
  const uniqueSorted = [
    ...new Set(dates.map(toCalendarDate).filter((d) => d <= todayStr)),
  ].sort((a, b) => (a > b ? -1 : 1)) // descending

  if (uniqueSorted.length === 0) {
    return { streakDays: 0, isActiveToday: false }
  }

  const isActiveToday = uniqueSorted[0] === todayStr

  // The streak must start from today OR yesterday (you can still extend it today)
  const mostRecent = uniqueSorted[0]
  const gap = daysBetween(mostRecent, todayStr)

  // If the most recent entry is older than yesterday, streak is broken
  if (gap > 1) {
    return { streakDays: 0, isActiveToday: false }
  }

  // Count consecutive days backwards from the most recent entry
  let streakDays = 1
  for (let i = 1; i < uniqueSorted.length; i++) {
    const diff = daysBetween(uniqueSorted[i], uniqueSorted[i - 1])
    if (Math.round(diff) === 1) {
      streakDays++
    } else {
      break
    }
  }

  return { streakDays, isActiveToday }
}
