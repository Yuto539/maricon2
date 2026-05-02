import type { SupabaseClient } from '@supabase/supabase-js'
import type { UsageRecord } from '@/lib/types'
import type { UsageRepository } from '@/lib/repositories/types'

export class SupabaseUsageRepository implements UsageRepository {
  constructor(private supabase: SupabaseClient) {}

  async getToday(userId: string, date: string): Promise<UsageRecord> {
    const { data, error } = await this.supabase
      .from('usage_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error || !data) {
      return {
        userId,
        date,
        aiRequestsToday: 0,
        subscriptionTier: 'free',
      }
    }

    return {
      userId: data.user_id as string,
      date: data.date as string,
      aiRequestsToday: (data.ai_requests_today as number) ?? 0,
      subscriptionTier: (data.subscription_tier as UsageRecord['subscriptionTier']) ?? 'free',
    }
  }

  async increment(userId: string, date: string): Promise<void> {
    const { data: existing } = await this.supabase
      .from('usage_records')
      .select('ai_requests_today')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (existing) {
      await this.supabase
        .from('usage_records')
        .update({ ai_requests_today: ((existing.ai_requests_today as number) ?? 0) + 1 })
        .eq('user_id', userId)
        .eq('date', date)
    } else {
      await this.supabase.from('usage_records').insert({
        user_id: userId,
        date,
        ai_requests_today: 1,
        subscription_tier: 'free',
      })
    }
  }
}
