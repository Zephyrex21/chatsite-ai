import { describe, it, expect } from 'vitest';
import { ScrapingService } from '@/lib/services/scraping/scraping.service';
import {
  ScraperError,
  type ScrapedContent,
  type ScraperProvider,
} from '@/lib/services/scraping/types';
import type {
  ScrapedSiteRepository,
  UpsertScrapedSiteInput,
} from '@/lib/repositories/scraped-site.repository';

/** Minimal shape matching the fields ScrapingService actually reads off a ScrapedSite. */
type FakeScrapedSite = UpsertScrapedSiteInput & {
  id: string;
  expiresAt: Date | null;
  suggestedQuestions: string[];
};

class FakeScraperProvider implements ScraperProvider {
  public calls: string[] = [];
  constructor(private readonly result: ScrapedContent | (() => Promise<ScrapedContent>)) {}

  async scrape(url: string): Promise<ScrapedContent> {
    this.calls.push(url);
    return typeof this.result === 'function' ? this.result() : this.result;
  }
}

class FakeScrapedSiteRepository implements ScrapedSiteRepository {
  private store = new Map<string, FakeScrapedSite>();

  async findFreshByUrl(url: string) {
    const site = this.store.get(url);
    if (!site) return null;
    if (site.expiresAt && site.expiresAt.getTime() < Date.now()) return null;
    return site as unknown as Awaited<ReturnType<ScrapedSiteRepository['findFreshByUrl']>>;
  }

  async upsert(input: UpsertScrapedSiteInput) {
    const site: FakeScrapedSite = {
      ...input,
      id: `fake-id-${this.store.size}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      suggestedQuestions: [],
    };
    this.store.set(input.url, site);
    return site as unknown as Awaited<ReturnType<ScrapedSiteRepository['upsert']>>;
  }

  async deleteExpired(): Promise<number> {
    let count = 0;
    for (const [url, site] of this.store) {
      if (site.expiresAt && site.expiresAt.getTime() < Date.now()) {
        this.store.delete(url);
        count++;
      }
    }
    return count;
  }

  async setSuggestedQuestions(id: string, questions: string[]): Promise<void> {
    for (const site of this.store.values()) {
      if (site.id === id) {
        site.suggestedQuestions = questions;
        return;
      }
    }
  }

  /** Test helper: seed the cache directly, bypassing upsert(). */
  seed(url: string, site: FakeScrapedSite) {
    this.store.set(url, site);
  }
}

const sampleContent: ScrapedContent = {
  url: 'https://example.com',
  title: 'Example Domain',
  markdown: '# Example Domain\n\nThis domain is for use in examples.',
  wordCount: 8,
};

describe('ScrapingService', () => {
  it('rejects an invalid URL before ever calling the provider', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    const service = new ScrapingService(provider, repository);

    await expect(service.scrapeUrl('http://localhost:3000')).rejects.toMatchObject({
      code: 'INVALID_URL',
    });
    expect(provider.calls).toHaveLength(0);
  });

  it('rejects private IP ranges before calling the provider (SSRF protection)', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    const service = new ScrapingService(provider, repository);

    await expect(
      service.scrapeUrl('http://169.254.169.254/latest/meta-data'),
    ).rejects.toMatchObject({ code: 'INVALID_URL' });
    expect(provider.calls).toHaveLength(0);
  });

  it('calls the provider and persists the result on a cache miss', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    const service = new ScrapingService(provider, repository);

    const result = await service.scrapeUrl('https://example.com');

    expect(provider.calls).toEqual(['https://example.com/']);
    expect(result.fromCache).toBe(false);
    expect(result.markdown).toBe(sampleContent.markdown);

    const cached = await repository.findFreshByUrl('https://example.com/');
    expect(cached).not.toBeNull();
  });

  it('returns cached content and never calls the provider on a cache hit', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    repository.seed('https://example.com/', {
      id: 'seeded-id-1',
      url: 'https://example.com/',
      title: 'Cached Title',
      markdown: 'cached markdown',
      wordCount: 2,
      expiresAt: new Date(Date.now() + 60_000),
      suggestedQuestions: ['What is this site about?'],
    });
    const service = new ScrapingService(provider, repository);

    const result = await service.scrapeUrl('https://example.com');

    expect(provider.calls).toHaveLength(0);
    expect(result.fromCache).toBe(true);
    expect(result.title).toBe('Cached Title');
  });

  it('calls the provider again when the cached entry has expired', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    repository.seed('https://example.com/', {
      id: 'seeded-id-2',
      url: 'https://example.com/',
      title: 'Stale Title',
      markdown: 'stale markdown',
      wordCount: 2,
      expiresAt: new Date(Date.now() - 1000), // already expired
      suggestedQuestions: [],
    });
    const service = new ScrapingService(provider, repository);

    const result = await service.scrapeUrl('https://example.com');

    expect(provider.calls).toEqual(['https://example.com/']);
    expect(result.fromCache).toBe(false);
    expect(result.title).toBe(sampleContent.title);
  });

  it('propagates a ScraperError from the provider without wrapping it', async () => {
    const provider = new FakeScraperProvider(() => {
      throw new ScraperError('RATE_LIMITED', 'slow down');
    });
    const repository = new FakeScrapedSiteRepository();
    const service = new ScrapingService(provider, repository);

    await expect(service.scrapeUrl('https://example.com')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: 'slow down',
    });
  });

  it('normalizes the URL (strips tracking params) before checking the cache', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    const service = new ScrapingService(provider, repository);

    await service.scrapeUrl('https://example.com/?utm_source=twitter');

    // The provider should have been called with the normalized URL, not the
    // raw one with tracking params still attached.
    expect(provider.calls).toEqual(['https://example.com/']);
  });

  it('returns an empty suggestedQuestions array on a fresh scrape', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    const service = new ScrapingService(provider, repository);

    const result = await service.scrapeUrl('https://example.com');

    expect(result.suggestedQuestions).toEqual([]);
  });

  it('returns cached suggestedQuestions on a cache hit', async () => {
    const provider = new FakeScraperProvider(sampleContent);
    const repository = new FakeScrapedSiteRepository();
    repository.seed('https://example.com/', {
      id: 'seeded-id-3',
      url: 'https://example.com/',
      title: 'Cached Title',
      markdown: 'cached markdown',
      wordCount: 2,
      expiresAt: new Date(Date.now() + 60_000),
      suggestedQuestions: ['What is this site about?', 'Who built it?'],
    });
    const service = new ScrapingService(provider, repository);

    const result = await service.scrapeUrl('https://example.com');

    expect(result.suggestedQuestions).toEqual(['What is this site about?', 'Who built it?']);
  });
});
