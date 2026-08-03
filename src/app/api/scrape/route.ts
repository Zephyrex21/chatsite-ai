import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ScrapingService } from '@/lib/services/scraping/scraping.service';
import { FirecrawlProvider } from '@/lib/services/scraping/firecrawl-provider';
import { ScraperError, type ScraperErrorCode } from '@/lib/services/scraping/types';
import { PrismaScrapedSiteRepository } from '@/lib/repositories/scraped-site.repository';
import { expensiveRateLimit } from '@/lib/rate-limit/client';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';
import { logger } from '@/lib/logger';

// Constructed once per server instance, not per-request — the provider and
// repository are cheap to hold onto and this avoids re-reading env vars on
// every call.
const scrapingService = new ScrapingService(
  new FirecrawlProvider(process.env.FIRECRAWL_API_KEY ?? ''),
  new PrismaScrapedSiteRepository(),
);

export async function POST(request: Request) {
  const session = await auth();
  const identifier = resolveRateLimitIdentifier({
    userId: session?.user?.id ?? null,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await expensiveRateLimit.limit(identifier);
  if (!success) {
    logger.warn('rate_limit.hit', { route: '/api/scrape', identifier });
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const url = extractUrl(body);
  if (!url) {
    return NextResponse.json({ error: 'A "url" string field is required.' }, { status: 400 });
  }

  logger.info('scrape.requested', { url, identifier });

  try {
    const result = await scrapingService.scrapeUrl(url);
    logger.info('scrape.completed', { url, fromCache: result.fromCache });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ScraperError) {
      logger.warn('scrape.failed', { url, code: err.code, message: err.message });
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusForErrorCode(err.code) },
      );
    }
    logger.error('scrape.unexpected_error', err, { url });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

function extractUrl(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('url' in body)) return null;
  const value = (body as { url: unknown }).url;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function statusForErrorCode(code: ScraperErrorCode): number {
  switch (code) {
    case 'INVALID_URL':
      return 400;
    case 'RATE_LIMITED':
      return 429;
    case 'TIMEOUT':
      return 504;
    case 'INSUFFICIENT_CREDITS':
      return 402;
    case 'UNREACHABLE':
    case 'UPSTREAM_ERROR':
    default:
      return 502;
  }
}
