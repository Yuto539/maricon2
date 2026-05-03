import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SupabasePartnerRepository } from '@/lib/repositories/supabase/SupabasePartnerRepository'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const repo = new SupabasePartnerRepository(supabase)
  const partners = await repo.findAllByUser(user.id)

  return <DashboardClient initialPartners={partners} />
}
