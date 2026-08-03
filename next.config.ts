import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {/* config options here */};

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
