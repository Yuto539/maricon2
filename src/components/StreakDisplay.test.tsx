import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StreakDisplay from './StreakDisplay'

describe('StreakDisplay', () => {
  it('renders streak count with correct text', () => {
    render(<StreakDisplay streakDays={7} isActiveToday={false} />)
    expect(screen.getByText('7日継続中')).toBeInTheDocument()
  })

  it('renders "まだ記録がありません" when streakDays is 0', () => {
    render(<StreakDisplay streakDays={0} isActiveToday={false} />)
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })

  it('does not render streak count text when streakDays is 0', () => {
    render(<StreakDisplay streakDays={0} isActiveToday={false} />)
    expect(screen.queryByText('0日継続中')).not.toBeInTheDocument()
  })

  it('shows active Flame icon when isActiveToday is true', () => {
    render(<StreakDisplay streakDays={5} isActiveToday={true} />)
    const flame = screen.getByTestId('flame-icon')
    expect(flame).toHaveAttribute('data-active', 'true')
  })

  it('shows inactive Flame icon when isActiveToday is false and streakDays > 0', () => {
    render(<StreakDisplay streakDays={3} isActiveToday={false} />)
    const flame = screen.getByTestId('flame-icon')
    expect(flame).toHaveAttribute('data-active', 'false')
  })

  it('hides Flame icon when streakDays is 0', () => {
    render(<StreakDisplay streakDays={0} isActiveToday={false} />)
    expect(screen.queryByTestId('flame-icon')).not.toBeInTheDocument()
  })

  it('hides Flame icon when streakDays is 0 even if isActiveToday is true', () => {
    render(<StreakDisplay streakDays={0} isActiveToday={true} />)
    expect(screen.queryByTestId('flame-icon')).not.toBeInTheDocument()
  })

  it('renders streak 1 day correctly', () => {
    render(<StreakDisplay streakDays={1} isActiveToday={true} />)
    expect(screen.getByText('1日継続中')).toBeInTheDocument()
  })
})
