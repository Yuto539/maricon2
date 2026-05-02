// ── AIProvider interface ───────────────────────────────────────────────────

export interface AIProvider {
  generateText(prompt: string, systemPrompt: string): Promise<string>
}

export interface AIProviderConfig {
  maxRetries?: number
  timeoutMs?: number
}

// ── MockAIProvider ─────────────────────────────────────────────────────────

/**
 * MockAIProvider — a no-op provider that always returns a fixed response.
 * Useful for unit tests and Storybook.
 */
export class MockAIProvider implements AIProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config?: AIProviderConfig) {
    // No-op; config accepted for interface compatibility
  }

  async generateText(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _prompt: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _systemPrompt: string,
  ): Promise<string> {
    return 'mock response'
  }
}

// ── FallbackAIProvider ─────────────────────────────────────────────────────

/**
 * FallbackAIProvider — tries the primary provider first; if it throws,
 * attempts the fallback. If both fail, re-throws the fallback error.
 */
export class FallbackAIProvider implements AIProvider {
  private readonly primary: AIProvider
  private readonly fallback: AIProvider

  constructor(
    primary: AIProvider,
    fallback: AIProvider,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config?: AIProviderConfig,
  ) {
    this.primary = primary
    this.fallback = fallback
  }

  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    try {
      return await this.primary.generateText(prompt, systemPrompt)
    } catch {
      return await this.fallback.generateText(prompt, systemPrompt)
    }
  }
}

// ── createMockProvider ─────────────────────────────────────────────────────

/**
 * createMockProvider — factory that creates a provider with a predetermined
 * response or error. Used to precisely control behaviour in tests.
 */
export function createMockProvider(response: string | Error): AIProvider {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async generateText(_prompt: string, _systemPrompt: string): Promise<string> {
      if (response instanceof Error) {
        throw response
      }
      return response
    },
  }
}
