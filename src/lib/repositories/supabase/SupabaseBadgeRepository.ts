import type { SupabaseClient } from '@supabase/supabase-js'
import type { Badge } from '@/lib/types'
import type { BadgeRepository } from '@/lib/repositories/types'

export class SupabaseBadgeRepository implements BadgeRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByUser(userId: string): Promise<Badge[]> {
    const { data, error } = await this.supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => this.mapRow(row))
  }

  async awardBadge(userId: string, badgeType: string, partnerId?: string): Promise<Badge> {
    // Check if already awarded (idempotent)
    const { data: existing } = await this.supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_type', badgeType)
      .single()

    if (existing) return this.mapRow(existing)

    const { data: row, error } = await this.supabase
      .from('badges')
      .insert({
        user_id: userId,
        badge_type: badgeType,
        partner_id: partnerId ?? null,
        earned_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error || !row) throw new Error('Failed to award badge')
    return this.mapRow(row)
  }

  async hasBadge(userId: string, badgeType: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_type', badgeType)
      .single()
    return !error && data !== null
  }

  private mapRow(row: Record<string, unknown>): Badge {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      partnerId: row.partner_id as string | undefined,
      badgeType: row.badge_type as string,
      earnedAt: row.earned_at as string,
    }
  }
}
