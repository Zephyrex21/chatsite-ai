import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sign-in', () => {
  test('sign-in button navigates to the Auth.js sign-in page', async ({ page }) => {
    // Generous timeout specifically here: this is the first test to hit
    // /api/auth/*, a heavier route (provider config, adapter setup) than
    // the plain landing page — under Playwright's parallel workers, a
    // cold Next.js dev-server compile of this route can plausibly exceed
    // the default 30s while several other tests compile other routes at
    // the same time. If this still times out in isolation
    // (`npx playwright test sign-in.spec.ts --workers=1`), that's a real
    // bug, not dev-server contention.
    test.setTimeout(60_000);

    await page.goto('/');

    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/api\/auth\/signin/);
  });

  test('sign-in page has no automatically detectable accessibility violations', async ({
    page,
  }) => {
    // This is Auth.js's own built-in page — not yet custom-styled (see
    // README/ADR notes on that). If this test ever fails, the fix isn't
    // in our own components; it's a signal that a custom-styled sign-in
    // page (a real, previously-noted future enhancement) is now worth
    // prioritizing rather than relying on the stock page's accessibility.
    await page.goto('/api/auth/signin');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });
});
