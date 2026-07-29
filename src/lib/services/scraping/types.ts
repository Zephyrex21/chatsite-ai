/**
 * Shared types for the scraping layer. Kept framework-agnostic (no Next.js
 * imports) so the service and provider are unit-testable in isolation.
 */

export interface ScrapedContent {
  /** The canonical URL the content was scraped from (as reported by the provider, when available). */
  url: string;
  title: string | null;
  markdown: string;
  wordCount: number;
}

export type ScraperErrorCode =
  | 'INVALID_URL'
  | 'UNREACHABLE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_CREDITS'
  | 'UPSTREAM_ERROR';

/**
 * A typed, catchable error for every way a scrape can fail. Route handlers
 * map `code` to an appropriate HTTP status rather than leaking raw
 * provider errors to the client.
 */
export class ScraperError extends Error {
  readonly code: ScraperErrorCode;
  readonly cause?: unknown;

  constructor(code: ScraperErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Anything that can turn a URL into scraped content. Firecrawl is the only
 * implementation today, but swapping providers later (or adding a
 * self-hosted fallback) only means writing a new class against this
 * interface — the service and its tests don't change.
 */
export interface ScraperProvider {
  scrape(url: string): Promise<ScrapedContent>;
}
