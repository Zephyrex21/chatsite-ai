/**
 * Centralizes reading GEMINI_API_KEY instead of the six separate
 * `process.env.GEMINI_API_KEY ?? ''` reads this used to be scattered
 * across (one per route file that constructs a GeminiClient) — one place
 * to fix a bug in how the key is read, rather than six.
 *
 * Trims whitespace and strips a pair of surrounding quote characters if
 * present. Both are real, common mistakes when pasting a key into
 * Vercel's environment-variable UI (a trailing newline from copying out
 * of a terminal, or pasting `"AIzaSy..."` including the quotes some
 * `.env` conventions use) — the key then *looks* present in the
 * dashboard but silently fails Google's auth check on every call. This
 * doesn't fix every possible cause of an invalid key, but it closes off
 * this specific, easy-to-hit one at zero cost to the valid case.
 */
export function getGeminiApiKey(): string {
  const raw = process.env.GEMINI_API_KEY ?? '';
  const trimmed = raw.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted;
}
