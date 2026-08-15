import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logs info events as a single JSON line to console.log', () => {
    logger.info('scrape.requested', { url: 'https://example.com' });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
    expect(parsed).toMatchObject({
      level: 'info',
      event: 'scrape.requested',
      url: 'https://example.com',
    });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('logs warn events to console.warn, not console.log', () => {
    logger.warn('rate_limit.hit', { identifier: 'ip:1.2.3.4' });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    const parsed = JSON.parse(consoleWarnSpy.mock.calls[0]?.[0] as string);
    expect(parsed.level).toBe('warn');
  });

  it('logs error events to console.error with a serialized error object', () => {
    const err = new Error('boom');
    logger.error('scrape.failed', err, { url: 'https://example.com' });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleErrorSpy.mock.calls[0]?.[0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.error.message).toBe('boom');
    expect(typeof parsed.error.stack).toBe('string');
  });

  it('forwards every error() call to Sentry.captureException', () => {
    const err = new Error('boom');
    logger.error('scrape.failed', err, { url: 'https://example.com' });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ extra: expect.objectContaining({ event: 'scrape.failed' }) }),
    );
  });

  it('handles a non-Error thrown value without crashing', () => {
    logger.error('weird.failure', 'just a string, not an Error object');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleErrorSpy.mock.calls[0]?.[0] as string);
    expect(parsed.error).toBe('just a string, not an Error object');
  });

  it('walks a two-level error cause chain instead of dropping it', () => {
    // Mirrors the real shape in production: ChatError wraps an AiError,
    // which itself wraps the raw SDK error. Before this fix, only the
    // outer wrapper's message ever made it into the log.
    const rootCause = new Error('403 PERMISSION_DENIED: API key does not have access');
    const middleWrapper = new Error('Both Gemini models failed to start a response.');
    (middleWrapper as unknown as { cause: unknown }).cause = rootCause;

    logger.error('chat.ai_failed', middleWrapper, { sessionId: 'abc' });

    const parsed = JSON.parse(consoleErrorSpy.mock.calls[0]?.[0] as string);
    expect(parsed.error.message).toBe('Both Gemini models failed to start a response.');
    expect(parsed.error.cause.message).toBe('403 PERMISSION_DENIED: API key does not have access');
  });

  it('stops walking the cause chain at a bounded depth rather than looping forever on a circular cause', () => {
    const circular = new Error('circular');
    (circular as unknown as { cause: unknown }).cause = circular;

    expect(() => logger.error('weird.circular', circular)).not.toThrow();
  });

  it('omits `cause` entirely when the error has none', () => {
    logger.error('scrape.failed', new Error('plain error, no cause'));

    const parsed = JSON.parse(consoleErrorSpy.mock.calls[0]?.[0] as string);
    expect(parsed.error.cause).toBeUndefined();
  });
});
