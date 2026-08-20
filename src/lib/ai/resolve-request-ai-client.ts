import { GeminiClient } from './gemini-client';
import { getGeminiApiKey } from './gemini-api-key';
import { USER_GEMINI_KEY_HEADER } from '@/lib/user-gemini-key';
import type { AiClient } from './types';

/**
 * "Bring your own API key" — server side of the pair with
 * `src/lib/user-gemini-key.ts`. If the request carries the user's own key
 * (never persisted anywhere; read straight off the header and discarded
 * once this request finishes), a fresh GeminiClient is constructed with
 * it for this request only. Otherwise falls back to the shared server
 * key. Constructing a new GeminiClient per BYOK request is intentional
 * and cheap — it's a thin SDK wrapper, not a connection pool — rather
 * than trying to reuse the module-level default client's instance for a
 * different key.
 */
export function resolveRequestAiClient(request: Request, defaultClient: AiClient): AiClient {
  const userKey = request.headers.get(USER_GEMINI_KEY_HEADER)?.trim();
  return userKey ? new GeminiClient(userKey) : defaultClient;
}

/** Convenience for routes that don't already have a default client handy. */
export function resolveRequestAiClientWithServerDefault(request: Request): AiClient {
  return resolveRequestAiClient(request, new GeminiClient(getGeminiApiKey()));
}
