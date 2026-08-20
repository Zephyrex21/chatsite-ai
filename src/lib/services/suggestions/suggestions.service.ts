import type { AiClient } from '@/lib/ai/types';
import type { ScrapedSiteRepository } from '@/lib/repositories/scraped-site.repository';
import type { ScrapeResult } from '@/lib/services/scraping/scraping.service';

/**
 * Generates 4 starter questions for a scraped page, caching the result on
 * the ScrapedSite row so it's a one-time cost per URL rather than per
 * session — the tenth person to chat with an already-known page reuses
 * the same suggestions the first person triggered.
 *
 * Deliberately fails soft: suggestions are a nice-to-have, never
 * something that should block a chat session from being created. Any
 * failure (AI error, malformed response) just means an empty array comes
 * back, which the frontend already treats as "no chips to show".
 */
export class SuggestionService {
  constructor(
    private readonly aiClient: AiClient,
    private readonly repository: ScrapedSiteRepository,
  ) {}

  async getOrGenerate(site: ScrapeResult): Promise<string[]> {
    if (site.suggestedQuestions.length > 0) {
      return site.suggestedQuestions;
    }

    const questions = await this.aiClient.suggestQuestions({
      url: site.url,
      title: site.title,
      markdown: site.markdown,
    });

    if (questions.length > 0) {
      // Best-effort cache write — if this fails, the session still gets
      // created successfully with the questions the caller already has
      // in hand; only the *next* person to open this URL pays the cost
      // of regenerating them.
      try {
        await this.repository.setSuggestedQuestions(site.id, questions);
      } catch {
        // Intentionally swallowed — see comment above.
      }
    }

    return questions;
  }
}
