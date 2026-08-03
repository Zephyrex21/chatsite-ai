import * as Sentry from '@sentry/nextjs';

// If NEXT_PUBLIC_SENTRY_DSN isn't set (e.g. local dev without a Sentry
// account yet), Sentry's SDK is designed to no-op safely rather than
// error — nothing needs to conditionally skip this.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Session replay is genuinely useful for debugging UI bugs a user
  // reports, but recording 100% of sessions is unnecessary cost/noise —
  // sample lightly for normal sessions, always record on an actual error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Required so Sentry can instrument client-side route transitions (App
// Router navigations) as part of its performance tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
