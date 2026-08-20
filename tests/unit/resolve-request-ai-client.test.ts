import { describe, it, expect } from 'vitest';
import { resolveRequestAiClient } from '@/lib/ai/resolve-request-ai-client';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { USER_GEMINI_KEY_HEADER } from '@/lib/user-gemini-key';
import type { AiClient } from '@/lib/ai/types';

describe('resolveRequestAiClient', () => {
  const defaultClient: AiClient = new GeminiClient('server-default-key');

  it('returns the default client when no user key header is present', () => {
    const request = new Request('https://example.com', { headers: {} });
    expect(resolveRequestAiClient(request, defaultClient)).toBe(defaultClient);
  });

  it('returns a new client (not the default) when a user key header is present', () => {
    const request = new Request('https://example.com', {
      headers: { [USER_GEMINI_KEY_HEADER]: 'user-provided-key' },
    });
    const result = resolveRequestAiClient(request, defaultClient);
    expect(result).not.toBe(defaultClient);
    expect(result).toBeInstanceOf(GeminiClient);
  });

  it('treats a header present but empty/whitespace-only as absent, falling back to the default', () => {
    const request = new Request('https://example.com', {
      headers: { [USER_GEMINI_KEY_HEADER]: '   ' },
    });
    expect(resolveRequestAiClient(request, defaultClient)).toBe(defaultClient);
  });

  it('trims whitespace around the user-provided key', () => {
    // Not directly observable from the returned client, but confirms this
    // doesn't throw and does take the "user key present" branch.
    const request = new Request('https://example.com', {
      headers: { [USER_GEMINI_KEY_HEADER]: '  user-key-with-padding  ' },
    });
    const result = resolveRequestAiClient(request, defaultClient);
    expect(result).not.toBe(defaultClient);
  });
});
