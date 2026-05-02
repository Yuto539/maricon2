import type { SupabaseClient } from '@supabase/supabase-js'
import type { DuoSession, NewDuoSession, Question } from '@/lib/types'
import type { DuoSessionRepository } from '@/lib/repositories/types'

export class SupabaseDuoSessionRepository implements DuoSessionRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: NewDuoSession): Promise<DuoSession> {
    const { data: row, error } = await this.supabase
      .from('duo_sessions')
      .insert({
        partner_id: data.partnerId,
        creator_id: data.creatorId,
        session_type: data.sessionType,
        token: data.token,
        questions: data.questions,
        creator_answers: data.creatorAnswers,
        partner_answers: data.partnerAnswers,
        revealed_at: data.revealedAt,
        expires_at: data.expiresAt,
        partner_viewed: data.partnerViewed ?? false,
      })
      .select()
      .single()
    if (error || !row) throw new Error('Failed to create duo session')
    return this.mapRow(row)
  }

  async findByToken(token: string): Promise<DuoSession | null> {
    const { data, error } = await this.supabase
      .from('duo_sessions')
      .select('*')
      .eq('token', token)
      .single()
    if (error || !data) return null
    return this.mapRow(data)
  }

  async update(id: string, data: Partial<DuoSession>): Promise<DuoSession> {
    const updatePayload: Record<string, unknown> = {}
    if (data.partnerAnswers !== undefined) updatePayload.partner_answers = data.partnerAnswers
    if (data.creatorAnswers !== undefined) updatePayload.creator_answers = data.creatorAnswers
    if (data.revealedAt !== undefined) updatePayload.revealed_at = data.revealedAt
    if (data.partnerViewed !== undefined) updatePayload.partner_viewed = data.partnerViewed
    if (data.questions !== undefined) updatePayload.questions = data.questions

    const { data: row, error } = await this.supabase
      .from('duo_sessions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()
    if (error || !row) throw new Error('Failed to update duo session')
    return this.mapRow(row)
  }

  private mapRow(row: Record<string, unknown>): DuoSession {
    return {
      id: row.id as string,
      partnerId: row.partner_id as string,
      creatorId: row.creator_id as string,
      sessionType: row.session_type as DuoSession['sessionType'],
      token: row.token as string,
      questions: (row.questions as Question[]) ?? [],
      creatorAnswers: row.creator_answers as Record<string, string> | undefined,
      partnerAnswers: row.partner_answers as Record<string, string> | undefined,
      revealedAt: row.revealed_at as string | undefined,
      expiresAt: row.expires_at as string,
      partnerViewed: (row.partner_viewed as boolean) ?? false,
      createdAt: row.created_at as string,
    }
  }
}
