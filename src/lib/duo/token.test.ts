import { describe, it, expect } from 'vitest'
import {
  generateDuoToken,
  isDuoTokenExpired,
  createDuoExpiresAt,
} from './token'

// ── generateDuoToken ───────────────────────────────────────────────────────

describe('generateDuoToken', () => {
  it('returns a string of exactly 32 characters', () => {
    expect(generateDuoToken()).toHaveLength(32)
  })

  it('returns only hex characters (0-9, a-f)', () => {
    const token = generateDuoToken()
    expect(token).toMatch(/^[0-9a-f]{32}$/)
  })

  it('generates different tokens on successive calls (randomness check)', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateDuoToken()))
    // With 32 hex chars the collision probability is astronomically small
    expect(tokens.size).toBe(20)
  })

  it('returns a lowercase hex string', () => {
    const token = generateDuoToken()
    expect(token).toBe(token.toLowerCase())
  })
})

// ── isDuoTokenExpired ──────────────────────────────────────────────────────

describe('isDuoTokenExpired', () => {
  const FIXED_NOW = new Date('2026-05-02T12:00:00.000Z')

  it('returns true when expiresAt is in the past', () => {
    expect(
      isDuoTokenExpired('2026-05-01T12:00:00.000Z', FIXED_NOW),
    ).toBe(true)
  })

  it('returns true when expiresAt is exactly now (boundary — already expired)', () => {
    expect(
      isDuoTokenExpired('2026-05-02T12:00:00.000Z', FIXED_NOW),
    ).toBe(true)
  })

  it('returns false when expiresAt is 1 second in the future', () => {
    expect(
      isDuoTokenExpired('2026-05-02T12:00:01.000Z', FIXED_NOW),
    ).toBe(false)
  })

  it('returns false when expiresAt is 24 hours in the future', () => {
    expect(
      isDuoTokenExpired('2026-05-03T12:00:00.000Z', FIXED_NOW),
    ).toBe(false)
  })

  it('returns true when expiresAt is 1 ms in the past', () => {
    expect(
      isDuoTokenExpired('2026-05-02T11:59:59.999Z', FIXED_NOW),
    ).toBe(true)
  })

  it('uses system clock when no "now" is provided (smoke test — no throw)', () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString()
    expect(() => isDuoTokenExpired(futureDate)).not.toThrow()
    expect(isDuoTokenExpired(futureDate)).toBe(false)
  })
})

// ── createDuoExpiresAt ─────────────────────────────────────────────────────

describe('createDuoExpiresAt', () => {
  it('returns an ISO string', () => {
    const result = createDuoExpiresAt(new Date('2026-05-02T12:00:00.000Z'))
    expect(() => new Date(result)).not.toThrow()
    expect(new Date(result).toISOString()).toBe(result)
  })

  it('returns a time exactly 24 hours after the provided createdAt', () => {
    const createdAt = new Date('2026-05-02T10:00:00.000Z')
    const expected = new Date('2026-05-03T10:00:00.000Z').toISOString()
    expect(createDuoExpiresAt(createdAt)).toBe(expected)
  })

  it('returns a time exactly 24 hours ahead of midnight', () => {
    const createdAt = new Date('2026-05-02T00:00:00.000Z')
    const expected = new Date('2026-05-03T00:00:00.000Z').toISOString()
    expect(createDuoExpiresAt(createdAt)).toBe(expected)
  })

  it('returns a time in the future when called without argument (smoke test)', () => {
    const before = Date.now()
    const result = createDuoExpiresAt()
    const resultMs = new Date(result).getTime()
    expect(resultMs).toBeGreaterThan(before)
    // Should be approximately 24h from now (within a 5 second tolerance)
    expect(resultMs - before).toBeGreaterThanOrEqual(86_400_000 - 5_000)
  })

  it('handles leap second / non-standard times without throwing', () => {
    const createdAt = new Date('2026-02-28T23:59:59.999Z')
    expect(() => createDuoExpiresAt(createdAt)).not.toThrow()
  })
})
