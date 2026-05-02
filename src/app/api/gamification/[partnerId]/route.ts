import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabasePartnerRepository } from '@/lib/repositories/supabase/SupabasePartnerRepository'
import { SupabaseMessageRepository } from '@/lib/repositories/supabase/SupabaseMessageRepository'
import { SupabaseBadgeRepository } from '@/lib/repositories/supabase/SupabaseBadgeRepository'
import { handleGamificationRequest } from './handler'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partnerId: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { partnerId } = await params
  const partnerRepo = new SupabasePartnerRepository(supabase)
  const messageRepo = new SupabaseMessageRepository(supabase)
  const badgeRepo = new SupabaseBadgeRepository(supabase)

  const result = await handleGamificationRequest(partnerId, user.id, {
    getPartner: (pid, uid) => partnerRepo.findById(pid, uid),
    getMessages: (pid) => messageRepo.findByPartnerId(pid),
    getBadges: (uid) => badgeRepo.findByUser(uid),
    // Daily challenge not yet persisted — return null until implemented
    getDailyChallenge: async () => null,
  })

  return NextResponse.json(result.body, { status: result.status })
}
