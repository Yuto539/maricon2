import type { SupabaseClient } from '@supabase/supabase-js'
import type { Message } from '@/lib/types'
import type { MessageRepository } from '@/lib/repositories/types'

export class SupabaseMessageRepository implements MessageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByPartnerId(partnerId: string, limit?: number): Promise<Message[]> {
    let query = this.supabase
      .from('messages')
      .select('*')
      .eq('partner_id', partnerId)
      .order('sent_at', { ascending: true })

    if (limit !== undefined) {
      query = query.limit(limit)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => this.mapRow(row))
  }

  async create(data: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const { data: row, error } = await this.supabase
      .from('messages')
      .insert({
        partner_id: data.partnerId,
        sender: data.sender,
        content: data.content,
        sent_at: data.sentAt,
        topic_tags: data.topicTags,
        sentiment: data.sentiment,
      })
      .select()
      .single()
    if (error || !row) throw new Error('Failed to create message')
    return this.mapRow(row)
  }

  async findRecentByPartnerId(partnerId: string, limit: number): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('partner_id', partnerId)
      .order('sent_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => this.mapRow(row))
  }

  private mapRow(row: Record<string, unknown>): Message {
    return {
      id: row.id as string,
      partnerId: row.partner_id as string,
      sender: row.sender as Message['sender'],
      content: row.content as string,
      sentAt: row.sent_at as string,
      topicTags: row.topic_tags as string[] | undefined,
      sentiment: row.sentiment as number | undefined,
      createdAt: row.created_at as string,
    }
  }
}
