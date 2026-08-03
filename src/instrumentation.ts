/**
 * Next.js calls register() once when a new server instance starts, before
 * it handles any requests. Used here to load the right Sentry init file
 * for whichever runtime this particular server instance is running in.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Reports errors from nested React Server Components that Next.js itself
// catches before they'd otherwise reach a route handler's own try/catch.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
