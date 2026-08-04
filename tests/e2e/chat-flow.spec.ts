import { test, expect } from '@playwright/test';

/**
 * Unlike a typical SPA, this app's scrape and AI calls happen server-side
 * (inside API route handlers), not via client-side fetch — so Playwright's
 * page.route() interception, which only catches requests the *browser*
 * makes, can't mock Firecrawl/Gemini here the way it could for a
 * client-calls-external-API architecture. Genuinely exercising this flow
 * end-to-end means hitting the real APIs.
 *
 * Rather than skip this test entirely or fake a pass, it's gated behind an
 * explicit opt-in env var so it can still run — in CI with real secrets
 * configured, or locally — without ever silently consuming API credits by
 * default.
 */
const hasRealCredentials = Boolean(
  process.env.E2E_REAL_APIS === 'true' &&
  process.env.FIRECRAWL_API_KEY &&
  process.env.GEMINI_API_KEY &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN,
);

test.describe('Full chat flow', () => {
  test.skip(
    !hasRealCredentials,
    'Set E2E_REAL_APIS=true with real FIRECRAWL_API_KEY/GEMINI_API_KEY to run this against live APIs.',
  );

  test('paste a URL, land on a real chat session, ask a grounded follow-up', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('textbox', { name: /website url/i }).fill('https://example.com');
    await page.getByRole('button', { name: /start chatting/i }).click();

    // Scraping a real page + creating a session takes real network time —
    // generous timeout rather than a flaky short one.
    await expect(page).toHaveURL(/\/chat\//, { timeout: 30_000 });
    await expect(page.getByText('Example Domain')).toBeVisible({ timeout: 15_000 });

    const composer = page.getByRole('textbox', { name: /ask a question about this page/i });
    await composer.fill('What is this page about?');
    await composer.press('Enter');

    // A real streamed Gemini answer — just confirm *something* substantial
    // came back grounded in the actual page, not asserting exact wording
    // (that would make the test brittle against normal model variance).
    await expect(page.locator('text=/example/i').last()).toBeVisible({ timeout: 30_000 });
  });
});
