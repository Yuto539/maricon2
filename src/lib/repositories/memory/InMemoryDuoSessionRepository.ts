import { randomUUID } from 'crypto'
import type { DuoSession, NewDuoSession } from '@/lib/types'
import type { DuoSessionRepository } from '@/lib/repositories/types'

export class InMemoryDuoSessionRepository implements DuoSessionRepository {
  private storeById = new Map<string, DuoSession>()
  private storeByToken = new Map<string, string>() // token -> id

  async create(data: NewDuoSession): Promise<DuoSession> {
    const session: DuoSession = {
      ...data,
      partnerViewed: data.partnerViewed ?? false,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    this.storeById.set(session.id, session)
    this.storeByToken.set(session.token, session.id)
    return session
  }

  async findByToken(token: string): Promise<DuoSession | null> {
    const id = this.storeByToken.get(token)
    if (id === undefined) return null
    return this.storeById.get(id) ?? null
  }

  async update(id: string, data: Partial<DuoSession>): Promise<DuoSession> {
    const existing = this.storeById.get(id)
    if (!existing) {
      throw new Error(`DuoSession not found: ${id}`)
    }
    const updated: DuoSession = { ...existing, ...data }
    this.storeById.set(id, updated)
    // token mapping remains valid (token cannot change)
    return updated
  }
}
