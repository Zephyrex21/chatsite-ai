import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

/**
 * Third-party origins the app legitimately talks to from the browser, so
 * the CSP below can name them explicitly instead of falling back to a
 * wide-open `*`. Kept as one list so adding/removing a vendor is a
 * one-line change, not a hunt through the policy string.
 */
const SENTRY_INGEST = 'https://*.ingest.sentry.io https://*.ingest.us.sentry.io';
const VERCEL_INSIGHTS = 'https://vitals.vercel-insights.com https://va.vercel-scripts.com';
const OAUTH_PROVIDERS = 'https://github.com https://accounts.google.com';

/**
 * Security headers, applied to every route. Next.js doesn't set any of
 * these by default.
 *
 * `script-src`/`style-src` include `'unsafe-inline'` because the App
 * Router doesn't wire up per-request CSP nonces out of the box (that
 * needs a middleware.ts that generates a nonce and threads it through
 * `next/headers` into every inline `<style>`/script Next.js itself
 * injects) — a meaningfully bigger change than this pass. Everything
 * else below (frame-ancestors, object-src, base-uri, the explicit
 * connect-src allowlist) still meaningfully narrows the attack surface
 * even with that one exception, so it's a real improvement over having
 * no CSP at all rather than a false sense of security.
 */
const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${VERCEL_INSIGHTS}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SENTRY_INGEST} ${VERCEL_INSIGHTS}`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self' ${OAUTH_PROVIDERS}`,
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  // 2 years, subdomains included, preload-eligible — standard for a site
  // that's exclusively served over HTTPS (Vercel enforces this anyway).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Belt-and-suspenders with frame-ancestors above — older browsers that
  // don't understand CSP's frame-ancestors still respect this.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Explicitly denies browser features this app has no use for, rather
  // than leaving them at each browser's own default.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

// Sentry's build-time plugin (source map upload, release tagging) needs an
// auth token to do anything beyond basic error capture — which isn't set up
// in local dev or in this project's CI yet. withSentryConfig() itself is
// safe to apply unconditionally: without SENTRY_AUTH_TOKEN, it silently
// skips the upload step rather than failing the build.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only print Sentry's own build logs in CI, not every local `npm run dev`.
  silent: !process.env.CI,
});
