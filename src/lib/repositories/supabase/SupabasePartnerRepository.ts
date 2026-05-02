import type { SupabaseClient } from '@supabase/supabase-js'
import type { Partner } from '@/lib/types'
import type { PartnerRepository } from '@/lib/repositories/types'

export class SupabasePartnerRepository implements PartnerRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string, userId: string): Promise<Partner | null> {
    const { data, error } = await this.supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error || !data) return null
    return this.mapRow(data)
  }

  async findAllByUser(userId: string): Promise<Partner[]> {
    const { data, error } = await this.supabase
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => this.mapRow(row))
  }

  async create(
    data: Omit<Partner, 'id' | 'createdAt' | 'bondLevel' | 'streakDays'>,
  ): Promise<Partner> {
    const { data: row, error } = await this.supabase
      .from('partners')
      .insert({
        user_id: data.userId,
        nickname: data.nickname,
        age: data.age,
        occupation: data.occupation,
        met_via: data.metVia,
        profile_notes: data.profileNotes,
        tags: data.tags,
        status: data.status,
        last_contact_at: data.lastContactAt,
      })
      .select()
      .single()
    if (error || !row) throw new Error('Failed to create partner')
    return this.mapRow(row)
  }

  async update(id: string, userId: string, data: Partial<Partner>): Promise<Partner | null> {
    const { data: row, error } = await this.supabase
      .from('partners')
      .update({
        nickname: data.nickname,
        age: data.age,
        occupation: data.occupation,
        met_via: data.metVia,
        profile_notes: data.profileNotes,
        tags: data.tags,
        status: data.status,
        bond_level: data.bondLevel,
        streak_days: data.streakDays,
        last_contact_at: data.lastContactAt,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error || !row) return null
    return this.mapRow(row)
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('partners')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    return !error
  }

  private mapRow(row: Record<string, unknown>): Partner {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      nickname: row.nickname as string,
      age: row.age as number | undefined,
      occupation: row.occupation as string | undefined,
      metVia: row.met_via as string | undefined,
      profileNotes: row.profile_notes as string | undefined,
      tags: (row.tags as string[]) ?? [],
      status: row.status as Partner['status'],
      bondLevel: (row.bond_level as number) ?? 0,
      streakDays: (row.streak_days as number) ?? 0,
      lastContactAt: row.last_contact_at as string | undefined,
      createdAt: row.created_at as string,
    }
  }
}
