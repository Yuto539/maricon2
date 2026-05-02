import { relativeTime } from '@/lib/utils/relativeTime'

export interface MessageListProps {
  messages: Array<{
    id: string
    sender: 'me' | 'partner'
    content: string
    sentAt: string
  }>
  partnerNickname: string
}

export default function MessageList({ messages, partnerNickname }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        まだメッセージがありません
      </div>
    )
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  )

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((msg) => {
        const isMe = msg.sender === 'me'
        return (
          <div
            key={msg.id}
            data-testid={`message-${msg.id}`}
            className={['flex flex-col', isMe ? 'items-end justify-end' : 'items-start justify-start'].join(' ')}
          >
            <span className="mb-0.5 text-xs text-muted-foreground">
              {isMe ? '自分' : partnerNickname}
            </span>
            <div
              className={[
                'max-w-xs rounded-lg px-3 py-2 text-sm',
                isMe ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground',
              ].join(' ')}
            >
              {msg.content}
            </div>
            <span data-testid={`message-time-${msg.id}`} className="mt-0.5 text-xs text-muted-foreground">
              {relativeTime(msg.sentAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
