import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PartnerForm from './PartnerForm'

describe('PartnerForm', () => {
  describe('field rendering', () => {
    it('renders nickname input', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/ニックネーム/)).toBeInTheDocument()
    })

    it('renders age input', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/年齢/)).toBeInTheDocument()
    })

    it('renders occupation input', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/職業/)).toBeInTheDocument()
    })

    it('renders metVia input', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/出会った場所/)).toBeInTheDocument()
    })

    it('renders profileNotes textarea', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/メモ/)).toBeInTheDocument()
    })
  })

  describe('submit button label', () => {
    it('shows "登録する" when no initialValues', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument()
    })

    it('shows "更新する" when initialValues provided', () => {
      render(
        <PartnerForm
          onSubmit={vi.fn()}
          initialValues={{ nickname: '花子', tags: [] }}
        />,
      )
      expect(screen.getByRole('button', { name: '更新する' })).toBeInTheDocument()
    })
  })

  describe('submit disabled states', () => {
    it('submit is disabled when nickname is empty', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled()
    })

    it('submit is enabled when nickname has value', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/ニックネーム/), {
        target: { value: '花子' },
      })
      expect(screen.getByRole('button', { name: '登録する' })).not.toBeDisabled()
    })

    it('submit is disabled when isLoading is true', () => {
      render(<PartnerForm onSubmit={vi.fn()} isLoading={true} />)
      fireEvent.change(screen.getByLabelText(/ニックネーム/), {
        target: { value: '花子' },
      })
      expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled()
    })
  })

  describe('tag management', () => {
    it('can add a tag via input + button', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      const tagInput = screen.getByPlaceholderText(/タグを追加/)
      fireEvent.change(tagInput, { target: { value: '優しい' } })
      fireEvent.click(screen.getByRole('button', { name: '追加' }))
      expect(screen.getByText('優しい')).toBeInTheDocument()
    })

    it('can remove a tag via × button', () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      const tagInput = screen.getByPlaceholderText(/タグを追加/)
      fireEvent.change(tagInput, { target: { value: '優しい' } })
      fireEvent.click(screen.getByRole('button', { name: '追加' }))
      expect(screen.getByText('優しい')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '優しい を削除' }))
      expect(screen.queryByText('優しい')).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls onSubmit with correct values when submitted', () => {
      const onSubmit = vi.fn()
      render(<PartnerForm onSubmit={onSubmit} />)

      fireEvent.change(screen.getByLabelText(/ニックネーム/), {
        target: { value: '花子' },
      })
      fireEvent.change(screen.getByLabelText(/年齢/), {
        target: { value: '25' },
      })
      fireEvent.change(screen.getByLabelText(/職業/), {
        target: { value: '看護師' },
      })
      fireEvent.click(screen.getByRole('button', { name: '登録する' }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '花子',
          age: 25,
          occupation: '看護師',
          tags: [],
        }),
      )
    })

    it('shows error when submitted with empty nickname', async () => {
      render(<PartnerForm onSubmit={vi.fn()} />)
      // Nickname is empty, try to submit via form submit directly
      const form = screen.getByRole('form')
      fireEvent.submit(form)
      await waitFor(() => {
        expect(screen.getByText(/ニックネームは必須です/)).toBeInTheDocument()
      })
    })
  })

  describe('initialValues prefill', () => {
    it('prefills values from initialValues', () => {
      render(
        <PartnerForm
          onSubmit={vi.fn()}
          initialValues={{
            nickname: '太郎',
            age: 30,
            occupation: 'エンジニア',
            metVia: 'マッチングアプリ',
            profileNotes: '趣味はサッカー',
            tags: ['面白い', '話しやすい'],
          }}
        />,
      )

      expect(screen.getByLabelText(/ニックネーム/)).toHaveValue('太郎')
      expect(screen.getByLabelText(/年齢/)).toHaveValue(30)
      expect(screen.getByLabelText(/職業/)).toHaveValue('エンジニア')
      expect(screen.getByLabelText(/出会った場所/)).toHaveValue('マッチングアプリ')
      expect(screen.getByLabelText(/メモ/)).toHaveValue('趣味はサッカー')
      expect(screen.getByText('面白い')).toBeInTheDocument()
      expect(screen.getByText('話しやすい')).toBeInTheDocument()
    })
  })
})
