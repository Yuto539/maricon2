import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DailyChallenge from './DailyChallenge'

const challenge = {
  id: 'ch-1',
  challengeText: '今日は相手の趣味について質問してみよう',
  completed: false,
}

const completedChallenge = {
  id: 'ch-2',
  challengeText: '写真を送ってみよう',
  completed: true,
}

describe('DailyChallenge', () => {
  it('renders challenge text', () => {
    render(<DailyChallenge challenge={challenge} onComplete={vi.fn()} />)
    expect(screen.getByText('今日は相手の趣味について質問してみよう')).toBeInTheDocument()
  })

  it('renders null state message when challenge is null', () => {
    render(<DailyChallenge challenge={null} onComplete={vi.fn()} />)
    expect(screen.getByText('今日のチャレンジはありません')).toBeInTheDocument()
  })

  it('"達成する" button is visible when not completed', () => {
    render(<DailyChallenge challenge={challenge} onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: '達成する' })).toBeInTheDocument()
  })

  it('"達成済み" text is shown when completed', () => {
    render(<DailyChallenge challenge={completedChallenge} onComplete={vi.fn()} />)
    expect(screen.getByText('達成済み')).toBeInTheDocument()
  })

  it('button is not visible when completed', () => {
    render(<DailyChallenge challenge={completedChallenge} onComplete={vi.fn()} />)
    expect(screen.queryByRole('button', { name: '達成する' })).not.toBeInTheDocument()
  })

  it('calls onComplete with correct id when button clicked', () => {
    const onComplete = vi.fn()
    render(<DailyChallenge challenge={challenge} onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: '達成する' }))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledWith('ch-1')
  })

  it('does not render button when challenge is null', () => {
    render(<DailyChallenge challenge={null} onComplete={vi.fn()} />)
    expect(screen.queryByRole('button', { name: '達成する' })).not.toBeInTheDocument()
  })

  it('completed challenge shows Check icon', () => {
    render(<DailyChallenge challenge={completedChallenge} onComplete={vi.fn()} />)
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })
})
