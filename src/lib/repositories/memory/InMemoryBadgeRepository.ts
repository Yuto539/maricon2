import { randomUUID } from 'crypto'
import type { Badge } from '@/lib/types'
import type { BadgeRepository } from '@/lib/repositories/types'

export class InMemoryBadgeRepository implements BadgeRepository {
  private store: Badge[] = []

  async findByUser(userId: string): Promise<Badge[]> {
    return this.store.filter((b) => b.userId === userId)
  }

  async awardBadge(userId: string, badgeType: string, partnerId?: string): Promise<Badge> {
    const existing = this.store.find(
      (b) => b.userId === userId && b.badgeType === badgeType,
    )
    if (existing) return existing

    const badge: Badge = {
      id: randomUUID(),
      userId,
      badgeType,
      earnedAt: new Date().toISOString(),
      ...(partnerId !== undefined ? { partnerId } : {}),
    }
    this.store.push(badge)
    return badge
  }

  async hasBadge(userId: string, badgeType: string): Promise<boolean> {
    return this.store.some((b) => b.userId === userId && b.badgeType === badgeType)
  }
}
