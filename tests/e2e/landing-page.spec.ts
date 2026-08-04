import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Landing page', () => {
  test('renders the hero and URL input', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /chat with any website/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /website url/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start chatting/i })).toBeVisible();
  });

  test('shows a validation error when submitting an empty URL', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /start chatting/i }).click();

    await expect(page.getByText(/enter a url to get started/i)).toBeVisible();
  });

  test('dark mode toggle actually changes the theme', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const initiallyDark = await html.evaluate((el) => el.classList.contains('dark'));

    await page.getByRole('button', { name: /switch to (dark|light) mode/i }).click();

    await expect(html).toHaveClass(initiallyDark ? /^((?!dark).)*$/ : /dark/);
  });

  test('the entire flow is reachable by keyboard alone', async ({ page }) => {
    await page.goto('/');

    // This directly closes a gap flagged (but not verified) back in
    // Phase 5 — a real keyboard-only walkthrough, not just a claim that
    // focus-visible styles exist.
    await page.keyboard.press('Tab'); // -> logo link
    await page.keyboard.press('Tab'); // -> sign in / theme toggle area
    await page.keyboard.press('Tab');

    const urlInput = page.getByRole('textbox', { name: /website url/i });
    // Keep tabbing until the URL input itself has focus, with a sane cap
    // so a real regression fails the test instead of looping forever.
    for (let i = 0; i < 10; i++) {
      if (await urlInput.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(urlInput).toBeFocused();

    await page.keyboard.type('https://example.com');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /start chatting/i })).toBeFocused();
  });

  test('has no automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });
});
