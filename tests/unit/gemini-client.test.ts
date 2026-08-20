import { describe, it, expect } from 'vitest';
import { GeminiClient, parseSuggestedQuestions } from '@/lib/ai/gemini-client';
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

  it('suggestQuestions returns an empty array (not a throw) when constructed with an empty key', async () => {
    const client = new GeminiClient('');
    await expect(
      client.suggestQuestions({ url: 'https://example.com', title: null, markdown: 'hi' }),
    ).resolves.toEqual([]);
  });
});

describe('parseSuggestedQuestions', () => {
  it('parses a clean JSON array', () => {
    const result = parseSuggestedQuestions('["What is this?", "Who made it?"]');
    expect(result).toEqual(['What is this?', 'Who made it?']);
  });

  it('strips a markdown code fence Gemini sometimes adds despite instructions not to', () => {
    const result = parseSuggestedQuestions('```json\n["One question?"]\n```');
    expect(result).toEqual(['One question?']);
  });

  it('strips a code fence with no language tag', () => {
    const result = parseSuggestedQuestions('```\n["One question?"]\n```');
    expect(result).toEqual(['One question?']);
  });

  it('returns [] for undefined input', () => {
    expect(parseSuggestedQuestions(undefined)).toEqual([]);
  });

  it('returns [] for malformed JSON rather than throwing', () => {
    expect(parseSuggestedQuestions('not json at all')).toEqual([]);
  });

  it('returns [] when the parsed value is valid JSON but not an array', () => {
    expect(parseSuggestedQuestions('{"question": "not an array"}')).toEqual([]);
  });

  it('filters out non-string entries rather than throwing', () => {
    const result = parseSuggestedQuestions('["real question?", 42, null, "another one?"]');
    expect(result).toEqual(['real question?', 'another one?']);
  });

  it('filters out blank/whitespace-only strings', () => {
    const result = parseSuggestedQuestions('["real question?", "   ", ""]');
    expect(result).toEqual(['real question?']);
  });

  it('caps the result at 4 questions even if the model returns more', () => {
    const many = JSON.stringify(['a?', 'b?', 'c?', 'd?', 'e?', 'f?']);
    expect(parseSuggestedQuestions(many)).toEqual(['a?', 'b?', 'c?', 'd?']);
  });

  it('truncates an implausibly long entry rather than passing it through as-is', () => {
    const long = 'x'.repeat(500);
    const result = parseSuggestedQuestions(JSON.stringify([long]));
    expect(result[0]).toHaveLength(200);
  });
});
