'use client'

export interface AiDrawerProps {
  isOpen: boolean
  onClose: () => void
  partnerId: string
  partnerNickname: string
  latestMessage?: string
  isLoading?: boolean
  error?: string
}

const SCENE_OPTIONS = [
  { label: '朝', value: 'morning' },
  { label: '夜', value: 'evening' },
  { label: '週末', value: 'weekend' },
  { label: 'デート後', value: 'after_date' },
  { label: 'おまかせ', value: 'general' },
] as const

export default function AiDrawer({
  isOpen,
  onClose,
  partnerId: _partnerId,
  partnerNickname,
  latestMessage,
  isLoading,
  error,
}: AiDrawerProps) {
  if (!isOpen) return null

  return (
    <div data-testid="ai-drawer-content" className="fixed inset-y-0 right-0 z-50 w-80 border-l border-border bg-background p-4">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">{partnerNickname}への提案</h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* Scene selector */}
      <div className="mb-4 flex flex-wrap gap-1">
        {SCENE_OPTIONS.map((scene) => (
          <button
            key={scene.value}
            type="button"
            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            {scene.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          話題を提案
        </button>

        {latestMessage !== undefined && (
          <button
            type="button"
            className="w-full rounded border border-border px-3 py-2 text-sm font-medium"
          >
            返信案を見る
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">生成中...</p>
      )}

      {/* Error state */}
      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
