import type { ScrapedSite } from '@prisma/client';
import { prisma } from './db';

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UpsertScrapedSiteInput {
  url: string;
  title: string | null;
  markdown: string;
  wordCount: number;
}

/**
 * Abstraction over ScrapedSite persistence. The scraping service depends on
 * this interface, not on Prisma directly, so tests can substitute an
 * in-memory fake instead of needing a real database.
 */
export interface ScrapedSiteRepository {
  findFreshByUrl(url: string): Promise<ScrapedSite | null>;
  upsert(input: UpsertScrapedSiteInput): Promise<ScrapedSite>;
  deleteExpired(): Promise<number>;
}

export class PrismaScrapedSiteRepository implements ScrapedSiteRepository {
  async findFreshByUrl(url: string): Promise<ScrapedSite | null> {
    const site = await prisma.scrapedSite.findUnique({ where: { url } });
    if (!site) return null;
    if (site.expiresAt && site.expiresAt.getTime() < Date.now()) return null;
    return site;
  }

  async upsert(input: UpsertScrapedSiteInput): Promise<ScrapedSite> {
    const expiresAt = new Date(Date.now() + DEFAULT_CACHE_TTL_MS);

    return prisma.scrapedSite.upsert({
      where: { url: input.url },
      create: { ...input, expiresAt },
      update: { ...input, expiresAt, scrapedAt: new Date() },
    });
  }

  /**
   * Deletes rows whose cache TTL has already passed. findFreshByUrl()
   * above already treats an expired row as a cache miss, so this doesn't
   * change any *behavior* — it reclaims storage for rows that were
   * already functionally dead, since nothing was ever deleting them.
   * Called on a schedule by `GET /api/cron/purge-expired-sites` (see
   * vercel.json). Returns the number of rows removed, purely for
   * logging/observability.
   */
  async deleteExpired(): Promise<number> {
    const { count } = await prisma.scrapedSite.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }
}
