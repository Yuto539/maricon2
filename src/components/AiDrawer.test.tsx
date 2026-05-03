import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AiDrawer from './AiDrawer'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  partnerId: 'partner-1',
  partnerNickname: 'さくら',
}

describe('AiDrawer', () => {
  describe('visibility', () => {
    it('renders content when isOpen is true', () => {
      render(<AiDrawer {...defaultProps} isOpen={true} />)
      expect(screen.getByTestId('ai-drawer-content')).toBeInTheDocument()
    })

    it('does not render content when isOpen is false', () => {
      render(<AiDrawer {...defaultProps} isOpen={false} />)
      expect(screen.queryByTestId('ai-drawer-content')).not.toBeInTheDocument()
    })
  })

  describe('header', () => {
    it('shows partnerNickname in header', () => {
      render(<AiDrawer {...defaultProps} partnerNickname="さくら" />)
      expect(screen.getByText(/さくら/)).toBeInTheDocument()
    })

    it('includes "への提案" in header', () => {
      render(<AiDrawer {...defaultProps} partnerNickname="はな" />)
      expect(screen.getByText(/はなへの提案/)).toBeInTheDocument()
    })
  })

  describe('scene selector', () => {
    it('scene selector has 5 options', () => {
      render(<AiDrawer {...defaultProps} />)
      const buttons = screen.getAllByRole('button', { name: /朝|夜|週末|デート後|おまかせ/ })
      expect(buttons).toHaveLength(5)
    })

    it('shows "朝" scene option', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.getByRole('button', { name: '朝' })).toBeInTheDocument()
    })

    it('shows "夜" scene option', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.getByRole('button', { name: '夜' })).toBeInTheDocument()
    })

    it('shows "週末" scene option', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.getByRole('button', { name: '週末' })).toBeInTheDocument()
    })

    it('shows "デート後" scene option', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'デート後' })).toBeInTheDocument()
    })

    it('shows "おまかせ" scene option', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'おまかせ' })).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('"話題を提案" button is present', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.getByRole('button', { name: '話題を提案' })).toBeInTheDocument()
    })

    it('"返信案を見る" button is present when latestMessage provided', () => {
      render(<AiDrawer {...defaultProps} latestMessage="こんにちは！" />)
      expect(screen.getByRole('button', { name: '返信案を見る' })).toBeInTheDocument()
    })

    it('"返信案を見る" button is absent when latestMessage is not provided', () => {
      render(<AiDrawer {...defaultProps} />)
      expect(screen.queryByRole('button', { name: '返信案を見る' })).not.toBeInTheDocument()
    })

    it('"返信案を見る" button is absent when latestMessage is undefined', () => {
      render(<AiDrawer {...defaultProps} latestMessage={undefined} />)
      expect(screen.queryByRole('button', { name: '返信案を見る' })).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows "生成中..." during loading', () => {
      render(<AiDrawer {...defaultProps} isLoading={true} />)
      expect(screen.getByText('生成中...')).toBeInTheDocument()
    })

    it('does not show "生成中..." when not loading', () => {
      render(<AiDrawer {...defaultProps} isLoading={false} />)
      expect(screen.queryByText('生成中...')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when error prop provided', () => {
      render(<AiDrawer {...defaultProps} error="提案の生成に失敗しました" />)
      expect(screen.getByText('提案の生成に失敗しました')).toBeInTheDocument()
    })
  })
})
