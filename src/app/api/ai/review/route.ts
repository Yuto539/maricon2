import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabasePartnerRepository } from '@/lib/repositories/supabase/SupabasePartnerRepository'
import { handleReviewRequest } from './handler'

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
  const aiProvider = await getAIProvider()

  const result = await handleReviewRequest(body, user.id, {
    getPartner: (partnerId, userId) => partnerRepo.findById(partnerId, userId),
    aiProvider,
  })

  return NextResponse.json(result.body, { status: result.status })
}
