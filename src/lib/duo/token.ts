import { randomBytes } from 'crypto'

const TOKEN_BYTES = 16 // 16 bytes = 32 hex chars
const MS_PER_DAY = 86_400_000

export function generateDuoToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

export function isDuoTokenExpired(expiresAt: string, now?: Date): boolean {
  const reference = now ?? new Date()
  return new Date(expiresAt).getTime() <= reference.getTime()
}

export function createDuoExpiresAt(createdAt?: Date): string {
  const base = createdAt ?? new Date()
  return new Date(base.getTime() + MS_PER_DAY).toISOString()
}
