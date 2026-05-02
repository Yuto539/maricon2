import { describe, it, expect, vi } from 'vitest'
import {
  MockAIProvider,
  FallbackAIProvider,
  createMockProvider,
  AIProvider,
} from './provider'

// ── Interface contract via createMockProvider ──────────────────────────────

describe('createMockProvider', () => {
  it('returns an object with a generateText method', () => {
    const provider = createMockProvider('hello')
    expect(typeof provider.generateText).toBe('function')
  })

  it('resolves with the provided string response', async () => {
    const provider = createMockProvider('こんにちは')
    const result = await provider.generateText('hi', 'system')
    expect(result).toBe('こんにちは')
  })

  it('rejects with the provided Error when given an Error', async () => {
    const error = new Error('API unavailable')
    const provider = createMockProvider(error)
    await expect(provider.generateText('hi', 'system')).rejects.toThrow(
      'API unavailable',
    )
  })

  it('ignores prompt and systemPrompt content (mock always returns preset)', async () => {
    const provider = createMockProvider('static response')
    const r1 = await provider.generateText('prompt A', 'system X')
    const r2 = await provider.generateText('prompt B', 'system Y')
    expect(r1).toBe('static response')
    expect(r2).toBe('static response')
  })

  it('accepts empty string as a valid response', async () => {
    const provider = createMockProvider('')
    const result = await provider.generateText('q', 's')
    expect(result).toBe('')
  })

  it('accepts response with Unicode / emoji content', async () => {
    const response = '返信案: 「今週末、一緒にカフェでも行きませんか? ☕」'
    const provider = createMockProvider(response)
    const result = await provider.generateText('draft reply', 'sys')
    expect(result).toBe(response)
  })
})

// ── MockAIProvider class ───────────────────────────────────────────────────

describe('MockAIProvider', () => {
  it('can be instantiated without config', () => {
    expect(() => new MockAIProvider()).not.toThrow()
  })

  it('can be instantiated with optional config', () => {
    expect(
      () => new MockAIProvider({ maxRetries: 3, timeoutMs: 5000 }),
    ).not.toThrow()
  })

  it('implements the AIProvider interface', () => {
    const provider = new MockAIProvider()
    expect(typeof provider.generateText).toBe('function')
  })

  it('generateText returns a string promise by default', async () => {
    const provider = new MockAIProvider()
    const result = await provider.generateText('test prompt', 'system prompt')
    expect(typeof result).toBe('string')
  })

  it('generateText accepts prompt and systemPrompt as strings', async () => {
    const provider = new MockAIProvider()
    await expect(
      provider.generateText('some prompt', 'some system'),
    ).resolves.toBeDefined()
  })
})

// ── FallbackAIProvider ─────────────────────────────────────────────────────

describe('FallbackAIProvider', () => {
  it('uses the primary provider when it succeeds', async () => {
    const primary = createMockProvider('primary response')
    const fallback = createMockProvider('fallback response')
    const provider = new FallbackAIProvider(primary, fallback)

    const result = await provider.generateText('prompt', 'system')
    expect(result).toBe('primary response')
  })

  it('falls back to secondary provider when primary throws', async () => {
    const primary = createMockProvider(new Error('Primary failed'))
    const fallback = createMockProvider('fallback response')
    const provider = new FallbackAIProvider(primary, fallback)

    const result = await provider.generateText('prompt', 'system')
    expect(result).toBe('fallback response')
  })

  it('throws when both primary and fallback fail', async () => {
    const primary = createMockProvider(new Error('Primary failed'))
    const fallback = createMockProvider(new Error('Fallback also failed'))
    const provider = new FallbackAIProvider(primary, fallback)

    await expect(provider.generateText('prompt', 'system')).rejects.toThrow()
  })

  it('passes the same prompt and systemPrompt to the fallback', async () => {
    const primaryError = new Error('Primary failed')
    const primary = createMockProvider(primaryError)

    // Use a spy to capture what was passed to fallback
    const fallbackGenerateText = vi.fn().mockResolvedValue('fallback ok')
    const fallback: AIProvider = { generateText: fallbackGenerateText }

    const provider = new FallbackAIProvider(primary, fallback)
    await provider.generateText('my prompt', 'my system')

    expect(fallbackGenerateText).toHaveBeenCalledWith('my prompt', 'my system')
  })

  it('does not call fallback when primary succeeds', async () => {
    const primary = createMockProvider('success')
    const fallbackGenerateText = vi.fn().mockResolvedValue('fallback')
    const fallback: AIProvider = { generateText: fallbackGenerateText }

    const provider = new FallbackAIProvider(primary, fallback)
    await provider.generateText('prompt', 'system')

    expect(fallbackGenerateText).not.toHaveBeenCalled()
  })

  it('can be instantiated with optional config', () => {
    const primary = createMockProvider('ok')
    const fallback = createMockProvider('fb')
    expect(
      () =>
        new FallbackAIProvider(primary, fallback, {
          maxRetries: 1,
          timeoutMs: 2000,
        }),
    ).not.toThrow()
  })

  it('implements the AIProvider interface', () => {
    const primary = createMockProvider('ok')
    const fallback = createMockProvider('fb')
    const provider = new FallbackAIProvider(primary, fallback)
    expect(typeof provider.generateText).toBe('function')
  })
})

// ── Type contract: AIProvider interface ───────────────────────────────────

describe('AIProvider interface contract', () => {
  it('any object with generateText(prompt, systemPrompt) satisfies the contract', async () => {
    const customProvider: AIProvider = {
      generateText: async (prompt, systemPrompt) =>
        `echo:${prompt}|${systemPrompt}`,
    }
    const result = await customProvider.generateText('hello', 'sys')
    expect(result).toBe('echo:hello|sys')
  })

  it('generateText must return a Promise<string>', async () => {
    const provider = createMockProvider('test')
    const promise = provider.generateText('p', 's')
    expect(promise).toBeInstanceOf(Promise)
    const result = await promise
    expect(typeof result).toBe('string')
  })
})
