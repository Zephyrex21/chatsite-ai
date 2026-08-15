import { NextResponse } from 'next/server';
import { PrismaScrapedSiteRepository } from '@/lib/repositories/scraped-site.repository';
import { logger } from '@/lib/logger';

/**
 * Scheduled cleanup for expired ScrapedSite cache rows (see
 * docs/security-checklist.md's "cache purging" note). Triggered by Vercel
 * Cron on the schedule in vercel.json — Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` on every scheduled invocation once
 * that env var is set, so comparing against the same shared secret is
 * enough to keep this endpoint from being triggered by anyone else. A
 * full admin session isn't the right fit here since Vercel Cron requests
 * aren't a signed-in browser session.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  try {
    const repository = new PrismaScrapedSiteRepository();
    const deletedCount = await repository.deleteExpired();
    logger.info('cron.purge_expired_sites', { deletedCount });
    return NextResponse.json({ deletedCount });
  } catch (err) {
    logger.error('cron.purge_expired_sites_failed', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
