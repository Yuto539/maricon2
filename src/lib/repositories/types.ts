import type { Partner, Message, UsageRecord, DuoSession, NewDuoSession, Badge } from '@/lib/types'

export interface PartnerRepository {
  findById(id: string, userId: string): Promise<Partner | null>
  findAllByUser(userId: string): Promise<Partner[]>
  create(data: Omit<Partner, 'id' | 'createdAt' | 'bondLevel' | 'streakDays'>): Promise<Partner>
  update(id: string, userId: string, data: Partial<Partner>): Promise<Partner | null>
  delete(id: string, userId: string): Promise<boolean>
}

export interface MessageRepository {
  findByPartnerId(partnerId: string, limit?: number): Promise<Message[]>
  create(data: Omit<Message, 'id' | 'createdAt'>): Promise<Message>
  findRecentByPartnerId(partnerId: string, limit: number): Promise<Message[]>
}

export interface UsageRepository {
  getToday(userId: string, date: string): Promise<UsageRecord>
  increment(userId: string, date: string): Promise<void>
}

export interface DuoSessionRepository {
  create(data: NewDuoSession): Promise<DuoSession>
  findByToken(token: string): Promise<DuoSession | null>
  update(id: string, data: Partial<DuoSession>): Promise<DuoSession>
}

export interface BadgeRepository {
  findByUser(userId: string): Promise<Badge[]>
  awardBadge(userId: string, badgeType: string, partnerId?: string): Promise<Badge>
  hasBadge(userId: string, badgeType: string): Promise<boolean>
}
