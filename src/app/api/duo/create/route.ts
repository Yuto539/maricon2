import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseDuoSessionRepository } from '@/lib/repositories/supabase/SupabaseDuoSessionRepository'
import { handleDuoCreateRequest } from './handler'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const sessionRepo = new SupabaseDuoSessionRepository(supabase)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const result = await handleDuoCreateRequest(body, user.id, {
    createSession: (data) => sessionRepo.create(data),
    // All tiers can use Duo (viral mechanic — see subscription.ts canUseDuoFeatures)
    canUseDuoCheck: async () => true,
    baseUrl,
  })

  return NextResponse.json(result.body, { status: result.status })
}
