import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface SerializedError {
  message: string;
  stack?: string;
  name?: string;
  // The actual bug this fixes: our own error classes (ChatError, AiError)
  // wrap an underlying cause, sometimes two levels deep (ChatError wraps
  // an AiError, which itself wraps the real SDK/network error). Without
  // walking `.cause` recursively here, logging `err.cause ?? err` at the
  // call site only ever surfaced the *next* wrapper's generic message —
  // never the actual root error a third-party SDK threw. That's exactly
  // what happened in production: `chat.ai_failed` logged the AiError's
  // own "both models failed" text instead of Gemini's real underlying
  // error, because this function silently dropped everything past the
  // first level.
  cause?: SerializedError | unknown;
}

/**
 * Structured (JSON-line) logging for key application events — scrape
 * requests, chat requests, rate-limit hits, errors — instead of ad-hoc
 * console.log/console.error calls with no consistent shape. A real log
 * aggregator (Vercel's own log drain, Datadog, etc.) can parse these
 * lines directly; a human reading raw terminal output still gets
 * everything on one line per event.
 *
 * error() also forwards to Sentry — this is the single place server-side
 * errors get reported, so route handlers don't need their own
 * Sentry.captureException calls scattered around.
 */
function write(level: LogLevel, event: string, context?: LogContext): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function serializeError(error: unknown, depth = 0): SerializedError | unknown {
  if (error instanceof Error) {
    // Bounded depth (not a circular-reference check) — real error chains
    // in this app are at most 2-3 levels deep, but an unbounded walk is
    // one bad third-party error class away from an infinite loop if
    // something ever sets `cause` to itself.
    const cause =
      depth < 5 && 'cause' in error && error.cause !== undefined
        ? serializeError(error.cause, depth + 1)
        : undefined;
    return { message: error.message, stack: error.stack, name: error.name, cause };
  }
  return error;
}

export const logger = {
  info(event: string, context?: LogContext): void {
    write('info', event, context);
  },

  warn(event: string, context?: LogContext): void {
    write('warn', event, context);
  },

  error(event: string, error: unknown, context?: LogContext): void {
    write('error', event, { ...context, error: serializeError(error) });
    Sentry.captureException(error, { extra: { event, ...context } });
  },
};
