import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { FirecrawlProvider } from '@/lib/services/scraping/firecrawl-provider';
import { ScraperError } from '@/lib/services/scraping/types';

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('FirecrawlProvider', () => {
  it('returns parsed content on a successful scrape', async () => {
    server.use(
      http.post(FIRECRAWL_URL, async ({ request }) => {
        const body = (await request.json()) as { url: string };
        expect(body.url).toBe('https://example.com');
        expect(request.headers.get('authorization')).toBe('Bearer fc-test-key');

        return HttpResponse.json({
          success: true,
          data: {
            markdown: '# Example Domain\n\nThis domain is for use in examples.',
            metadata: {
              title: 'Example Domain',
              sourceURL: 'https://example.com',
              statusCode: 200,
            },
          },
        });
      }),
    );

    const provider = new FirecrawlProvider('fc-test-key');
    const result = await provider.scrape('https://example.com');

    expect(result.title).toBe('Example Domain');
    expect(result.markdown).toContain('Example Domain');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('throws RATE_LIMITED on a 429 response', async () => {
    server.use(http.post(FIRECRAWL_URL, () => new HttpResponse(null, { status: 429 })));

    const provider = new FirecrawlProvider('fc-test-key');
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('throws INSUFFICIENT_CREDITS on a 402 response', async () => {
    server.use(http.post(FIRECRAWL_URL, () => new HttpResponse(null, { status: 402 })));

    const provider = new FirecrawlProvider('fc-test-key');
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
    });
  });

  it('throws UPSTREAM_ERROR when success is false', async () => {
    server.use(
      http.post(FIRECRAWL_URL, () =>
        HttpResponse.json({ success: false, error: 'Could not render page' }, { status: 200 }),
      ),
    );

    const provider = new FirecrawlProvider('fc-test-key');
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      message: 'Could not render page',
    });
  });

  it('throws UPSTREAM_ERROR when markdown is missing from an otherwise-successful response', async () => {
    server.use(
      http.post(FIRECRAWL_URL, () =>
        HttpResponse.json({ success: true, data: { metadata: { title: 'No content' } } }),
      ),
    );

    const provider = new FirecrawlProvider('fc-test-key');
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
    });
  });

  it('throws UPSTREAM_ERROR on a non-JSON response body', async () => {
    server.use(
      http.post(FIRECRAWL_URL, () => new HttpResponse('<html>not json</html>', { status: 200 })),
    );

    const provider = new FirecrawlProvider('fc-test-key');
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
    });
  });

  it('throws UNREACHABLE when the network request itself fails', async () => {
    server.use(http.post(FIRECRAWL_URL, () => HttpResponse.error()));

    const provider = new FirecrawlProvider('fc-test-key');
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
  });

  it('throws TIMEOUT when the request exceeds the configured timeout', async () => {
    server.use(
      http.post(FIRECRAWL_URL, async () => {
        // Delay longer than the provider's configured timeout below.
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ success: true, data: { markdown: 'too late' } });
      }),
    );

    const provider = new FirecrawlProvider('fc-test-key', 10);
    await expect(provider.scrape('https://example.com')).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('throws UPSTREAM_ERROR immediately if no API key is configured', async () => {
    const provider = new FirecrawlProvider('');
    await expect(provider.scrape('https://example.com')).rejects.toBeInstanceOf(ScraperError);
  });
});
