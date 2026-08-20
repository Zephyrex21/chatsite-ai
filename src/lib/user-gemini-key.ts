/**
 * "Bring your own API key" support. The key lives ONLY in the browser's
 * localStorage — it's attached as a request header on API calls and read
 * directly off that header server-side (see the X-User-Gemini-Key checks
 * in the API routes); it is never written to our database. That's a
 * deliberate privacy/liability choice: a key we never persist is a key
 * we can't leak from our own storage.
 */

const STORAGE_KEY = 'chatsite:gemini-api-key';
export const USER_GEMINI_KEY_HEADER = 'x-user-gemini-key';

export function getUserGeminiApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function setUserGeminiApiKey(key: string): void {
  window.localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearUserGeminiApiKey(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Attaches the header only when a key is actually set, so the server-side
 * check (falls back to the server key when the header is absent) works
 * without every call site needing its own conditional.
 */
export function withUserGeminiKeyHeader(
  headers: Record<string, string> = {},
): Record<string, string> {
  const key = getUserGeminiApiKey();
  return key ? { ...headers, [USER_GEMINI_KEY_HEADER]: key } : headers;
}
