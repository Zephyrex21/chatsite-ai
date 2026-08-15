import { describe, it, expect } from 'vitest';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { AiError } from '@/lib/ai/types';

describe('GeminiClient', () => {
  // GeminiClient is otherwise a thin wrapper around the Google GenAI SDK
  // (excluded from the coverage threshold for that reason — see
  // README.md's testing-philosophy note), but the empty-key check is real
  // branching logic worth covering on its own, and it's safe to test
  // without mocking the SDK: the check runs and throws before
  // streamAnswer() ever touches `this.ai`.
  it('fails fast with a clear message when constructed with an empty key, without ever calling the SDK', async () => {
    const client = new GeminiClient('');

    await expect(
      client.streamAnswer({ systemInstruction: 'test', history: [], question: 'hi' }).next(),
    ).rejects.toMatchObject({
      message: 'GEMINI_API_KEY is not configured.',
    });
  });

  it('the fail-fast error is an AiError', async () => {
    const client = new GeminiClient('');

    try {
      await client.streamAnswer({ systemInstruction: 'test', history: [], question: 'hi' }).next();
      expect.unreachable('expected streamAnswer to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AiError);
    }
  });
});
