import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseDuoSessionRepository } from '@/lib/repositories/supabase/SupabaseDuoSessionRepository'
import { handleDuoAnswerRequest } from './handler'

// This endpoint is called by the partner — unauthenticated
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const supabase = await createClient()
  const sessionRepo = new SupabaseDuoSessionRepository(supabase)

  const result = await handleDuoAnswerRequest(token, body, {
    getSession: (t) => sessionRepo.findByToken(t),
    updateSession: (id, data) => sessionRepo.update(id, data),
  })

  return NextResponse.json(result.body, { status: result.status })
}
