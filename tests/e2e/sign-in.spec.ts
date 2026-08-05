import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sign-in', () => {
  test('sign-in button navigates to the custom sign-in page', async ({ page }) => {
    await page.goto('/');

    // Scoped to the header specifically — the sidebar also renders its own
    // legitimate "Sign in" prompt ("Sign in to save your conversations...")
    // when signed out, so an unscoped getByRole('button', { name: /sign in/i })
    // matches two elements and Playwright's strict mode correctly refuses
    // to guess which one to click. This isn't an app bug — both buttons
    // are intentional — the test just needed to be specific about which
    // one it means.
    await page
      .getByRole('banner')
      .getByRole('button', { name: /sign in/i })
      .click();

    // /sign-in, not /api/auth/signin: auth.config.ts sets a custom
    // pages.signIn path, so Auth.js redirects here instead of its own
    // built-in page.
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('sign-in page has no automatically detectable accessibility violations', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });
});
