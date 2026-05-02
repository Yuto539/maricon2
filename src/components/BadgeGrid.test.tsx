import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BadgeGrid, { BadgeItem } from './BadgeGrid'

const earnedBadge: BadgeItem = {
  id: '1',
  name: 'メッセージ達人',
  description: '100通メッセージを送る',
  lucideIcon: 'MessageSquare',
  earned: true,
  earnedAt: '2026-04-01',
}

const unearnedBadge: BadgeItem = {
  id: '2',
  name: 'スター',
  description: '50日継続する',
  lucideIcon: 'Star',
  earned: false,
}

describe('BadgeGrid', () => {
  it('renders all badges', () => {
    render(<BadgeGrid badges={[earnedBadge, unearnedBadge]} />)
    expect(screen.getByText('メッセージ達人')).toBeInTheDocument()
    expect(screen.getByText('スター')).toBeInTheDocument()
  })

  it('earned badge has success styling', () => {
    render(<BadgeGrid badges={[earnedBadge]} />)
    const card = screen.getByTestId(`badge-card-${earnedBadge.id}`)
    expect(card).toHaveAttribute('data-earned', 'true')
  })

  it('unearned badge shows description text', () => {
    render(<BadgeGrid badges={[unearnedBadge]} />)
    expect(screen.getByText('50日継続する')).toBeInTheDocument()
  })

  it('earned badge shows earnedAt date', () => {
    render(<BadgeGrid badges={[earnedBadge]} />)
    expect(screen.getByText('2026-04-01')).toBeInTheDocument()
  })

  it('unearned badge does not show earnedAt', () => {
    render(<BadgeGrid badges={[unearnedBadge]} />)
    expect(screen.queryByTestId(`badge-earnedAt-${unearnedBadge.id}`)).not.toBeInTheDocument()
  })

  it('unknown icon renders without crashing', () => {
    const badgeWithUnknownIcon: BadgeItem = {
      id: '3',
      name: 'テスト',
      description: 'テスト用',
      lucideIcon: 'UnknownIconThatDoesNotExist',
      earned: false,
    }
    expect(() => render(<BadgeGrid badges={[badgeWithUnknownIcon]} />)).not.toThrow()
    expect(screen.getByText('テスト')).toBeInTheDocument()
  })

  it('empty badges array renders empty grid without crashing', () => {
    const { container } = render(<BadgeGrid badges={[]} />)
    const grid = container.querySelector('[data-testid="badge-grid"]')
    expect(grid).toBeInTheDocument()
    expect(grid?.children.length).toBe(0)
  })

  it('renders with 2-column grid layout', () => {
    render(<BadgeGrid badges={[earnedBadge, unearnedBadge]} />)
    const grid = screen.getByTestId('badge-grid')
    expect(grid.className).toMatch(/grid-cols-2/)
  })
})
