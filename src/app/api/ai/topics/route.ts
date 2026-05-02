import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabasePartnerRepository } from '@/lib/repositories/supabase/SupabasePartnerRepository'
import { SupabaseMessageRepository } from '@/lib/repositories/supabase/SupabaseMessageRepository'
import { SupabaseUsageRepository } from '@/lib/repositories/supabase/SupabaseUsageRepository'
import { handleTopicsRequest } from './handler'

// AI provider is loaded lazily to avoid bundling secrets in edge runtime
async function getAIProvider() {
  const { OpenAIProvider } = await import('@/lib/ai/openai')
  return new OpenAIProvider()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const partnerRepo = new SupabasePartnerRepository(supabase)
  const messageRepo = new SupabaseMessageRepository(supabase)
  const usageRepo = new SupabaseUsageRepository(supabase)
  const aiProvider = await getAIProvider()

  const result = await handleTopicsRequest(body, user.id, {
    getPartner: (partnerId, userId) => partnerRepo.findById(partnerId, userId),
    getRecentMessages: (partnerId, limit) =>
      messageRepo.findRecentByPartnerId(partnerId, limit),
    getUsage: (userId, date) => usageRepo.getToday(userId, date),
    incrementUsage: (userId, date) => usageRepo.increment(userId, date),
    aiProvider,
  })

  return NextResponse.json(result.body, { status: result.status })
}
