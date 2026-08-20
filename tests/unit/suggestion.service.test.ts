import { describe, it, expect } from 'vitest';
import { SuggestionService } from '@/lib/services/suggestions/suggestions.service';
import type { AiClient, SuggestQuestionsParams } from '@/lib/ai/types';
import type { ScrapedSiteRepository } from '@/lib/repositories/scraped-site.repository';
import type { ScrapeResult } from '@/lib/services/scraping/scraping.service';

class FakeAiClient implements AiClient {
  public receivedParams: SuggestQuestionsParams[] = [];
  public callCount = 0;

  constructor(private readonly result: string[] | (() => Promise<string[]>)) {}

  async *streamAnswer(): AsyncGenerator<string> {
    throw new Error('not used by these tests');
  }

  async suggestQuestions(params: SuggestQuestionsParams): Promise<string[]> {
    this.callCount++;
    this.receivedParams.push(params);
    return typeof this.result === 'function' ? this.result() : this.result;
  }
}

class FakeScrapedSiteRepository implements ScrapedSiteRepository {
  public savedQuestions: Record<string, string[]> = {};
  public setSuggestedQuestionsCalls = 0;

  async findFreshByUrl() {
    return null;
  }
  async upsert(): Promise<never> {
    throw new Error('not used by these tests');
  }
  async deleteExpired() {
    return 0;
  }
  async setSuggestedQuestions(id: string, questions: string[]): Promise<void> {
    this.setSuggestedQuestionsCalls++;
    this.savedQuestions[id] = questions;
  }
}

function makeSite(overrides: Partial<ScrapeResult> = {}): ScrapeResult {
  return {
    id: 'site-1',
    url: 'https://example.com',
    title: 'Example',
    markdown: '# Example\n\nSome content.',
    wordCount: 3,
    fromCache: false,
    suggestedQuestions: [],
    ...overrides,
  };
}

describe('SuggestionService', () => {
  it('generates and persists questions when the site has none cached yet', async () => {
    const ai = new FakeAiClient(['What is this?', 'Who made it?']);
    const repo = new FakeScrapedSiteRepository();
    const service = new SuggestionService(ai, repo);

    const result = await service.getOrGenerate(makeSite());

    expect(result).toEqual(['What is this?', 'Who made it?']);
    expect(ai.callCount).toBe(1);
    expect(repo.savedQuestions['site-1']).toEqual(['What is this?', 'Who made it?']);
  });

  it('reuses already-cached questions without calling the AI client again', async () => {
    const ai = new FakeAiClient(['should not be called']);
    const repo = new FakeScrapedSiteRepository();
    const service = new SuggestionService(ai, repo);

    const result = await service.getOrGenerate(
      makeSite({ suggestedQuestions: ['Cached question?'] }),
    );

    expect(result).toEqual(['Cached question?']);
    expect(ai.callCount).toBe(0);
    expect(repo.setSuggestedQuestionsCalls).toBe(0);
  });

  it('passes the site url, title, and markdown through to the AI client', async () => {
    const ai = new FakeAiClient(['A question?']);
    const repo = new FakeScrapedSiteRepository();
    const service = new SuggestionService(ai, repo);

    await service.getOrGenerate(
      makeSite({ url: 'https://real-site.com', title: 'Real Site', markdown: 'real content' }),
    );

    expect(ai.receivedParams[0]).toEqual({
      url: 'https://real-site.com',
      title: 'Real Site',
      markdown: 'real content',
    });
  });

  it('does not persist anything when the AI client returns an empty array', async () => {
    const ai = new FakeAiClient([]);
    const repo = new FakeScrapedSiteRepository();
    const service = new SuggestionService(ai, repo);

    const result = await service.getOrGenerate(makeSite());

    expect(result).toEqual([]);
    expect(repo.setSuggestedQuestionsCalls).toBe(0);
  });

  it('still returns the generated questions even if persisting them fails', async () => {
    const ai = new FakeAiClient(['A question?']);
    const repo = new FakeScrapedSiteRepository();
    repo.setSuggestedQuestions = async () => {
      throw new Error('db write failed');
    };
    const service = new SuggestionService(ai, repo);

    await expect(service.getOrGenerate(makeSite())).resolves.toEqual(['A question?']);
  });
});
