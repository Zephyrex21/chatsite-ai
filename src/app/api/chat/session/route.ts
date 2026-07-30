import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ScrapingService } from '@/lib/services/scraping/scraping.service';
import { FirecrawlProvider } from '@/lib/services/scraping/firecrawl-provider';
import { ScraperError } from '@/lib/services/scraping/types';
import { PrismaScrapedSiteRepository } from '@/lib/repositories/scraped-site.repository';
import { ChatService } from '@/lib/services/chat/chat.service';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';
import { expensiveRateLimit } from '@/lib/rate-limit/client';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';

const scrapingService = new ScrapingService(
  new FirecrawlProvider(process.env.FIRECRAWL_API_KEY ?? ''),
  new PrismaScrapedSiteRepository(),
);

const chatService = new ChatService(
  new GeminiClient(process.env.GEMINI_API_KEY ?? ''),
  new PrismaChatSessionRepository(),
);

/**
 * Starting a conversation is a compound operation: make sure the site is
 * scraped (reusing the cache from Phase 2), then create a ChatSession
 * linked to it — and linked to the signed-in user, if there is one. This
 * composition lives at the route level rather than inside either service,
 * since neither service should need to know about the other.
 *
 * Signing in is never required here — an anonymous caller still gets a
 * fully working session, just not one that shows up in "my history" later.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const identifier = resolveRateLimitIdentifier({
    userId,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await expensiveRateLimit.limit(identifier);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const url = extractString(body, 'url');
  if (!url) {
    return NextResponse.json({ error: 'A "url" string field is required.' }, { status: 400 });
  }

  try {
    const site = await scrapingService.scrapeUrl(url);
    const chatSession = await chatService.createSession(site.id, userId);

    return NextResponse.json({
      sessionId: chatSession.id,
      site: { url: site.url, title: site.title },
    });
  } catch (err) {
    if (err instanceof ScraperError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 502 });
    }
    console.error('Unexpected /api/chat/session error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

function extractString(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null || !(key in body)) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
