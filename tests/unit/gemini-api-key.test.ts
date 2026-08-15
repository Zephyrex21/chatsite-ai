import { describe, it, expect, afterEach } from 'vitest';
import { getGeminiApiKey } from '@/lib/ai/gemini-api-key';

describe('getGeminiApiKey', () => {
  const originalValue = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalValue;
    }
  });

  it('returns the value unchanged when it has no surrounding whitespace or quotes', () => {
    process.env.GEMINI_API_KEY = 'AIzaSyTestKey123';
    expect(getGeminiApiKey()).toBe('AIzaSyTestKey123');
  });

  it('trims leading and trailing whitespace, including a trailing newline', () => {
    process.env.GEMINI_API_KEY = '  AIzaSyTestKey123\n';
    expect(getGeminiApiKey()).toBe('AIzaSyTestKey123');
  });

  it('strips a pair of surrounding double quotes', () => {
    process.env.GEMINI_API_KEY = '"AIzaSyTestKey123"';
    expect(getGeminiApiKey()).toBe('AIzaSyTestKey123');
  });

  it('strips a pair of surrounding single quotes', () => {
    process.env.GEMINI_API_KEY = "'AIzaSyTestKey123'";
    expect(getGeminiApiKey()).toBe('AIzaSyTestKey123');
  });

  it('trims whitespace outside quotes before checking for quotes', () => {
    process.env.GEMINI_API_KEY = '  "AIzaSyTestKey123"  ';
    expect(getGeminiApiKey()).toBe('AIzaSyTestKey123');
  });

  it('does not strip a single leading or trailing quote alone', () => {
    process.env.GEMINI_API_KEY = '"AIzaSyTestKey123';
    expect(getGeminiApiKey()).toBe('"AIzaSyTestKey123');
  });

  it('returns an empty string when the variable is unset', () => {
    delete process.env.GEMINI_API_KEY;
    expect(getGeminiApiKey()).toBe('');
  });

  it('returns an empty string when the variable is set but blank', () => {
    process.env.GEMINI_API_KEY = '   ';
    expect(getGeminiApiKey()).toBe('');
  });
});
