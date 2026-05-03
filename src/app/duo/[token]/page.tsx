import { createClient } from '@/lib/supabase/server'
import { SupabaseDuoSessionRepository } from '@/lib/repositories/supabase/SupabaseDuoSessionRepository'
import DuoAnswerPage from './DuoAnswerPage'

interface Props {
  params: Promise<{ token: string }>
}

export default async function DuoTokenPage({ params }: Props) {
  const { token } = await params

  const supabase = await createClient()
  const repo = new SupabaseDuoSessionRepository(supabase)
  const session = await repo.findByToken(token)

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">このリンクは期限切れです</p>
      </div>
    )
  }

  const isExpired = new Date(session.expiresAt) < new Date()
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">このリンクは期限切れです</p>
      </div>
    )
  }

  const bothAnswered =
    !!session.creatorAnswers &&
    Object.keys(session.creatorAnswers).length > 0 &&
    !!session.partnerAnswers &&
    Object.keys(session.partnerAnswers).length > 0

  return (
    <DuoAnswerPage
      session={session}
      token={token}
      bothAnswered={bothAnswered}
    />
  )
}
