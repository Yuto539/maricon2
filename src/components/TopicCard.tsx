'use client'

import { Copy } from 'lucide-react'

export interface TopicCardProps {
  text: string
  depth: 'light' | 'medium' | 'deep'
  onCopy: () => void
  isCopied: boolean
}

const DEPTH_LABEL: Record<TopicCardProps['depth'], string> = {
  light: '軽め',
  medium: 'ふつう',
  deep: '深め',
}

export default function TopicCard({ text, depth, onCopy, isCopied }: TopicCardProps) {
  return (
    <div
      data-testid="topic-card"
      className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex flex-col gap-1">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {DEPTH_LABEL[depth]}
        </span>
        <p className="text-sm text-foreground">{text}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        aria-label={isCopied ? 'コピー済み' : 'コピー'}
      >
        <Copy size={12} />
        {isCopied ? 'コピー済み' : 'コピー'}
      </button>
    </div>
  )
}
