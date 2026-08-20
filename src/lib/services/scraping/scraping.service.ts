import { validatePublicUrl } from '@/lib/validation/url';
import type { ScrapedSiteRepository } from '@/lib/repositories/scraped-site.repository';
import { ScraperError, type ScraperProvider } from './types';

export interface ScrapeResult {
  id: string;
  url: string;
  title: string | null;
  markdown: string;
  wordCount: number;
  fromCache: boolean;
  suggestedQuestions: string[];
}

/**
 * Orchestrates a single "give me this URL as clean content" request:
 * validate -> check cache -> scrape on a miss -> persist -> return.
 *
 * Deliberately framework-agnostic: takes its dependencies as constructor
 * params (a ScraperProvider and a ScrapedSiteRepository) rather than
 * importing Next.js or Prisma directly, so it's fully unit-testable with
 * fakes in place of both.
 */
export class ScrapingService {
  constructor(
    private readonly provider: ScraperProvider,
    private readonly repository: ScrapedSiteRepository,
  ) {}

  async scrapeUrl(rawUrl: string): Promise<ScrapeResult> {
    const validation = validatePublicUrl(rawUrl);
    if (!validation.valid) {
      throw new ScraperError('INVALID_URL', validation.reason);
    }

    const url = validation.normalized;

    const cached = await this.repository.findFreshByUrl(url);
    if (cached) {
      return {
        id: cached.id,
        url: cached.url,
        title: cached.title,
        markdown: cached.markdown,
        wordCount: cached.wordCount,
        fromCache: true,
        suggestedQuestions: cached.suggestedQuestions,
      };
    }

    const scraped = await this.provider.scrape(url);

    const saved = await this.repository.upsert({
      url,
      title: scraped.title,
      markdown: scraped.markdown,
      wordCount: scraped.wordCount,
    });

    return {
      id: saved.id,
      url: saved.url,
      title: saved.title,
      markdown: saved.markdown,
      wordCount: saved.wordCount,
      fromCache: false,
      suggestedQuestions: saved.suggestedQuestions,
    };
  }
}
