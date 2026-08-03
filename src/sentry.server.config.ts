import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captures request headers/IP on errors — useful for debugging a
  // specific user's report, since our own structured logs (src/lib/logger.ts)
  // don't include this by default.
  sendDefaultPii: true,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
