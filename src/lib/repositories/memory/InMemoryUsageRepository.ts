import type { UsageRecord } from '@/lib/types'
import type { UsageRepository } from '@/lib/repositories/types'

export class InMemoryUsageRepository implements UsageRepository {
  private store = new Map<string, number>()

  private key(userId: string, date: string): string {
    return `${userId}:${date}`
  }

  async getToday(userId: string, date: string): Promise<UsageRecord> {
    const count = this.store.get(this.key(userId, date)) ?? 0
    return {
      userId,
      date,
      aiRequestsToday: count,
      subscriptionTier: 'free',
    }
  }

  async increment(userId: string, date: string): Promise<void> {
    const k = this.key(userId, date)
    this.store.set(k, (this.store.get(k) ?? 0) + 1)
  }
}
