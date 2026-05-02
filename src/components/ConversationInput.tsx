'use client'

import { useState } from 'react'

export interface ConversationInputProps {
  onSubmit: (message: { sender: 'me' | 'partner'; content: string }) => void
  isLoading?: boolean
}

export default function ConversationInput({ onSubmit, isLoading = false }: ConversationInputProps) {
  const [content, setContent] = useState('')
  const [sender, setSender] = useState<'me' | 'partner'>('me')

  const handleToggle = () => {
    setSender((prev) => (prev === 'me' ? 'partner' : 'me'))
  }

  const handleSubmit = () => {
    if (!content.trim() || isLoading) return
    onSubmit({ sender, content })
    setContent('')
  }

  const isDisabled = !content.trim() || isLoading

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="メッセージを入力..."
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="sender-toggle"
          onClick={handleToggle}
          className="rounded border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {sender === 'me' ? '自分' : '相手'}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
        >
          追加する
        </button>
      </div>
    </div>
  )
}
