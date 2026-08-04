import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sign-in', () => {
  test('sign-in button navigates to the Auth.js sign-in page', async ({ page }) => {
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
