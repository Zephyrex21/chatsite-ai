import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface SerializedError {
  message: string;
  stack?: string;
  name?: string;
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

function serializeError(error: unknown): SerializedError | unknown {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack, name: error.name };
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
