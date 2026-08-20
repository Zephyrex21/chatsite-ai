import { describe, it, expect, afterEach } from 'vitest';
import {
  getUserGeminiApiKey,
  setUserGeminiApiKey,
  clearUserGeminiApiKey,
  withUserGeminiKeyHeader,
  USER_GEMINI_KEY_HEADER,
} from '@/lib/user-gemini-key';

describe('user-gemini-key (BYOK localStorage helpers)', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns null when no key has ever been set', () => {
    expect(getUserGeminiApiKey()).toBeNull();
  });

  it('returns the key after it has been set', () => {
    setUserGeminiApiKey('AIzaSyTestKey');
    expect(getUserGeminiApiKey()).toBe('AIzaSyTestKey');
  });

  it('trims whitespace when setting a key', () => {
    setUserGeminiApiKey('  AIzaSyTestKey  ');
    expect(getUserGeminiApiKey()).toBe('AIzaSyTestKey');
  });

  it('returns null after clearing a previously-set key', () => {
    setUserGeminiApiKey('AIzaSyTestKey');
    clearUserGeminiApiKey();
    expect(getUserGeminiApiKey()).toBeNull();
  });

  it('treats a stored empty string the same as no key set', () => {
    window.localStorage.setItem('chatsite:gemini-api-key', '   ');
    expect(getUserGeminiApiKey()).toBeNull();
  });

  describe('withUserGeminiKeyHeader', () => {
    it('does not add the header when no key is set', () => {
      const headers = withUserGeminiKeyHeader({ 'Content-Type': 'application/json' });
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('adds the header when a key is set, preserving existing headers', () => {
      setUserGeminiApiKey('AIzaSyTestKey');
      const headers = withUserGeminiKeyHeader({ 'Content-Type': 'application/json' });
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        [USER_GEMINI_KEY_HEADER]: 'AIzaSyTestKey',
      });
    });

    it('works with no base headers argument at all', () => {
      setUserGeminiApiKey('AIzaSyTestKey');
      const headers = withUserGeminiKeyHeader();
      expect(headers).toEqual({ [USER_GEMINI_KEY_HEADER]: 'AIzaSyTestKey' });
    });
  });
});
