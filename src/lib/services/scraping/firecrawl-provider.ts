import { ScraperError, type ScrapedContent, type ScraperProvider } from './types';

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Shape of a successful Firecrawl /v2/scrape response. Firecrawl doesn't
 * publish a formal OpenAPI type for this, so this is intentionally
 * defensive (optional fields, fallbacks) rather than assuming every field
 * is always present.
 */
interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string | null;
      sourceURL?: string;
      url?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

export class FirecrawlProvider implements ScraperProvider {
  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async scrape(url: string): Promise<ScrapedContent> {
    if (!this.apiKey) {
      throw new ScraperError(
        'UPSTREAM_ERROR',
        'FIRECRAWL_API_KEY is not configured on the server.',
      );
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(FIRECRAWL_SCRAPE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: this.timeoutMs,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ScraperError(
          'TIMEOUT',
          `Scrape request timed out after ${this.timeoutMs}ms.`,
          err,
        );
      }
      throw new ScraperError('UNREACHABLE', 'Could not reach the Firecrawl API.', err);
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (response.status === 429) {
      throw new ScraperError(
        'RATE_LIMITED',
        'Firecrawl rate limit exceeded. Try again in a moment.',
      );
    }
    if (response.status === 402) {
      throw new ScraperError(
        'INSUFFICIENT_CREDITS',
        'The Firecrawl account is out of credits for this billing period.',
      );
    }

    let body: FirecrawlScrapeResponse;
    try {
      body = (await response.json()) as FirecrawlScrapeResponse;
    } catch (err) {
      throw new ScraperError('UPSTREAM_ERROR', 'Firecrawl returned a non-JSON response.', err);
    }

    if (!response.ok || !body.success || !body.data?.markdown) {
      throw new ScraperError(
        'UPSTREAM_ERROR',
        body.error ?? `Firecrawl request failed with status ${response.status}.`,
      );
    }

    const markdown = body.data.markdown;

    return {
      url: body.data.metadata?.sourceURL ?? body.data.metadata?.url ?? url,
      title: body.data.metadata?.title ?? null,
      markdown,
      wordCount: countWords(markdown),
    };
  }
}

function countWords(markdown: string): number {
  const trimmed = markdown.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
