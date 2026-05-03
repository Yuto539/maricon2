import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TopicCard from './TopicCard'

describe('TopicCard', () => {
  const defaultProps = {
    text: 'おすすめの話題テキスト',
    depth: 'light' as const,
    onCopy: vi.fn(),
    isCopied: false,
  }

  it('renders the topic text', () => {
    render(<TopicCard {...defaultProps} />)
    expect(screen.getByText('おすすめの話題テキスト')).toBeInTheDocument()
  })

  it('shows "軽め" label for depth "light"', () => {
    render(<TopicCard {...defaultProps} depth="light" />)
    expect(screen.getByText('軽め')).toBeInTheDocument()
  })

  it('shows "ふつう" label for depth "medium"', () => {
    render(<TopicCard {...defaultProps} depth="medium" />)
    expect(screen.getByText('ふつう')).toBeInTheDocument()
  })

  it('shows "深め" label for depth "deep"', () => {
    render(<TopicCard {...defaultProps} depth="deep" />)
    expect(screen.getByText('深め')).toBeInTheDocument()
  })

  it('shows "コピー" when isCopied is false', () => {
    render(<TopicCard {...defaultProps} isCopied={false} />)
    expect(screen.getByText('コピー')).toBeInTheDocument()
    expect(screen.queryByText('コピー済み')).not.toBeInTheDocument()
  })

  it('shows "コピー済み" when isCopied is true', () => {
    render(<TopicCard {...defaultProps} isCopied={true} />)
    expect(screen.getByText('コピー済み')).toBeInTheDocument()
    expect(screen.queryByText('コピー')).not.toBeInTheDocument()
  })

  it('calls onCopy when copy button is clicked', () => {
    const onCopy = vi.fn()
    render(<TopicCard {...defaultProps} onCopy={onCopy} isCopied={false} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('has a copy button', () => {
    render(<TopicCard {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has data-testid="topic-card"', () => {
    render(<TopicCard {...defaultProps} />)
    expect(screen.getByTestId('topic-card')).toBeInTheDocument()
  })
})
