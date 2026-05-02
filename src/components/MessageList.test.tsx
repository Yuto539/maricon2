import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageList from './MessageList'

const now = new Date('2026-05-02T12:00:00.000Z')

const messages = [
  {
    id: 'msg-1',
    sender: 'me' as const,
    content: 'こんにちは！',
    sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'msg-2',
    sender: 'partner' as const,
    content: 'やあ、元気？',
    sentAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
  },
]

describe('MessageList', () => {
  it('renders all messages', () => {
    render(<MessageList messages={messages} partnerNickname="さくら" />)
    expect(screen.getByText('こんにちは！')).toBeInTheDocument()
    expect(screen.getByText('やあ、元気？')).toBeInTheDocument()
  })

  it('my message is right-aligned', () => {
    render(<MessageList messages={[messages[0]]} partnerNickname="さくら" />)
    const myMessage = screen.getByTestId('message-msg-1')
    expect(myMessage.className).toMatch(/justify-end|text-right|ml-auto/)
  })

  it('partner message is left-aligned', () => {
    render(<MessageList messages={[messages[1]]} partnerNickname="さくら" />)
    const partnerMessage = screen.getByTestId('message-msg-2')
    expect(partnerMessage.className).toMatch(/justify-start|text-left|mr-auto/)
  })

  it('shows partnerNickname for partner messages', () => {
    render(<MessageList messages={[messages[1]]} partnerNickname="さくら" />)
    expect(screen.getByText('さくら')).toBeInTheDocument()
  })

  it('shows "自分" for my messages', () => {
    render(<MessageList messages={[messages[0]]} partnerNickname="さくら" />)
    expect(screen.getByText('自分')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(<MessageList messages={[]} partnerNickname="さくら" />)
    expect(screen.getByText('まだメッセージがありません')).toBeInTheDocument()
  })

  it('messages are in chronological order', () => {
    render(<MessageList messages={messages} partnerNickname="さくら" />)
    const allMessages = screen.getAllByTestId(/^message-msg-/)
    expect(allMessages[0]).toHaveAttribute('data-testid', 'message-msg-1')
    expect(allMessages[1]).toHaveAttribute('data-testid', 'message-msg-2')
  })

  it('shows relative time for each message', () => {
    render(<MessageList messages={messages} partnerNickname="さくら" />)
    // Should show some relative time text (actual value depends on real now)
    const timeEls = screen.getAllByTestId(/^message-time-/)
    expect(timeEls.length).toBe(2)
    timeEls.forEach(el => expect(el.textContent).toBeTruthy())
  })
})
