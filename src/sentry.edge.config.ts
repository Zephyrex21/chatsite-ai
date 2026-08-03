import * as Sentry from '@sentry/nextjs';

// Separate from sentry.server.config.ts because the Edge runtime is a
// distinct, more restricted environment (no Node.js APIs) — Next.js loads
// whichever of these two actually matches the runtime a given request hit.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
