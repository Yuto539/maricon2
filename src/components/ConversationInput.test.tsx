import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConversationInput from './ConversationInput'

describe('ConversationInput', () => {
  it('renders textarea', () => {
    render(<ConversationInput onSubmit={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('default sender is "自分"', () => {
    render(<ConversationInput onSubmit={vi.fn()} />)
    expect(screen.getByTestId('sender-toggle')).toHaveTextContent('自分')
  })

  it('clicking sender toggle switches to "相手"', () => {
    render(<ConversationInput onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByTestId('sender-toggle'))
    expect(screen.getByTestId('sender-toggle')).toHaveTextContent('相手')
  })

  it('clicking toggle again switches back to "自分"', () => {
    render(<ConversationInput onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByTestId('sender-toggle'))
    fireEvent.click(screen.getByTestId('sender-toggle'))
    expect(screen.getByTestId('sender-toggle')).toHaveTextContent('自分')
  })

  it('submit calls onSubmit with correct content and default sender', () => {
    const onSubmit = vi.fn()
    render(<ConversationInput onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'テストメッセージ' } })
    fireEvent.click(screen.getByRole('button', { name: '追加する' }))
    expect(onSubmit).toHaveBeenCalledWith({ sender: 'me', content: 'テストメッセージ' })
  })

  it('submit calls onSubmit with "partner" sender when toggled', () => {
    const onSubmit = vi.fn()
    render(<ConversationInput onSubmit={onSubmit} />)
    fireEvent.click(screen.getByTestId('sender-toggle'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'パートナーのメッセージ' } })
    fireEvent.click(screen.getByRole('button', { name: '追加する' }))
    expect(onSubmit).toHaveBeenCalledWith({ sender: 'partner', content: 'パートナーのメッセージ' })
  })

  it('clears textarea after submit', () => {
    render(<ConversationInput onSubmit={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'テスト' } })
    fireEvent.click(screen.getByRole('button', { name: '追加する' }))
    expect(textarea).toHaveValue('')
  })

  it('submit button is disabled when textarea is empty', () => {
    render(<ConversationInput onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: '追加する' })).toBeDisabled()
  })

  it('submit button is disabled when isLoading is true', () => {
    render(<ConversationInput onSubmit={vi.fn()} isLoading={true} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'some text' } })
    expect(screen.getByRole('button', { name: '追加する' })).toBeDisabled()
  })

  it('does not call onSubmit when content is whitespace-only', () => {
    const onSubmit = vi.fn()
    render(<ConversationInput onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '追加する' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
