import { randomUUID } from 'crypto'
import type { Message } from '@/lib/types'
import type { MessageRepository } from '@/lib/repositories/types'

export class InMemoryMessageRepository implements MessageRepository {
  private store = new Map<string, Message[]>()

  async findByPartnerId(partnerId: string, limit?: number): Promise<Message[]> {
    const messages = this.store.get(partnerId) ?? []
    if (limit !== undefined) {
      return messages.slice(0, limit)
    }
    return messages
  }

  async create(data: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const message: Message = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const existing = this.store.get(data.partnerId) ?? []
    this.store.set(data.partnerId, [...existing, message])
    return message
  }

  async findRecentByPartnerId(partnerId: string, limit: number): Promise<Message[]> {
    const messages = this.store.get(partnerId) ?? []
    return [...messages]
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit)
  }
}
