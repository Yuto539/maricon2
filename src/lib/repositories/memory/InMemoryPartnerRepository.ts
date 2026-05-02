import { randomUUID } from 'crypto'
import type { Partner } from '@/lib/types'
import type { PartnerRepository } from '@/lib/repositories/types'

export class InMemoryPartnerRepository implements PartnerRepository {
  private store = new Map<string, Partner>()

  async findById(id: string, userId: string): Promise<Partner | null> {
    const partner = this.store.get(id)
    if (!partner || partner.userId !== userId) return null
    return partner
  }

  async findAllByUser(userId: string): Promise<Partner[]> {
    return Array.from(this.store.values()).filter((p) => p.userId === userId)
  }

  async create(
    data: Omit<Partner, 'id' | 'createdAt' | 'bondLevel' | 'streakDays'>,
  ): Promise<Partner> {
    const partner: Partner = {
      ...data,
      id: randomUUID(),
      bondLevel: 0,
      streakDays: 0,
      createdAt: new Date().toISOString(),
    }
    this.store.set(partner.id, partner)
    return partner
  }

  async update(id: string, userId: string, data: Partial<Partner>): Promise<Partner | null> {
    const existing = this.store.get(id)
    if (!existing || existing.userId !== userId) return null
    const updated: Partner = { ...existing, ...data }
    this.store.set(id, updated)
    return updated
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = this.store.get(id)
    if (!existing || existing.userId !== userId) return false
    this.store.delete(id)
    return true
  }
}
