import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * Stricter limit for the expensive endpoints (scraping costs a Firecrawl
 * credit, chat costs a Gemini call) — these are the ones a viral share or
 * a scripted abuser would hammer first.
 */
export const expensiveRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'chatsite:ratelimit:expensive',
});

/** Looser limit for cheap, read-only endpoints like listing sessions. */
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'chatsite:ratelimit:api',
});
