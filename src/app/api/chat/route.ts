import { auth } from '@/auth';
import { ChatService } from '@/lib/services/chat/chat.service';
import { ChatError, type ChatErrorCode } from '@/lib/services/chat/types';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { getGeminiApiKey } from '@/lib/ai/gemini-api-key';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';
import { expensiveRateLimit } from '@/lib/rate-limit/client';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';
import { logger } from '@/lib/logger';

const chatService = new ChatService(
  new GeminiClient(getGeminiApiKey()),
  new PrismaChatSessionRepository(),
);

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const identifier = resolveRateLimitIdentifier({
    userId,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await expensiveRateLimit.limit(identifier);
  if (!success) {
    logger.warn('rate_limit.hit', { route: '/api/chat', identifier });
    return jsonError('Too many requests. Try again shortly.', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const sessionId = extractString(body, 'sessionId');
  const question = extractString(body, 'question');
  if (!sessionId || !question) {
    return jsonError('Both "sessionId" and "question" string fields are required.', 400);
  }

  logger.info('chat.requested', { sessionId, questionLength: question.length });

  const generator = chatService.ask(sessionId, question, userId);

  // Prime the generator once *before* returning a streaming Response. The
  // session-lookup failure (or an immediate AI failure) happens before the
  // first `yield` inside ChatService.ask(), so this lets us return a real
  // HTTP error status for that case instead of a 200 stream that silently
  // contains an error message in its body.
  let first: IteratorResult<string>;
  try {
    first = await generator.next();
  } catch (err) {
    if (err instanceof ChatError) {
      if (err.code === 'AI_ERROR') {
        // Unlike SESSION_NOT_FOUND/INVALID_INPUT (routine client-input
        // cases, logged as warn below), an AI_ERROR means the Gemini call
        // itself failed — a real backend problem worth error-level
        // logging and a Sentry report. `err.cause` carries the actual
        // underlying SDK error (status code, message) that produced the
        // deliberately generic user-facing message; logging only
        // `err.message` here would silently throw that root cause away.
        logger.error('chat.ai_failed', err.cause ?? err, { sessionId, code: err.code });
      } else {
        logger.warn('chat.failed', { sessionId, code: err.code, message: err.message });
      }
      return jsonError(err.message, statusForChatError(err.code), err.code);
    }
    logger.error('chat.unexpected_error', err, { sessionId });
    return jsonError('An unexpected error occurred.', 500);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done && first.value) {
          controller.enqueue(encoder.encode(first.value));
        }
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(chunk));
        }
        logger.info('chat.completed', { sessionId });
      } catch (err) {
        logger.error('chat.stream_interrupted', err, { sessionId });
        controller.enqueue(
          encoder.encode('\n\n[The response was interrupted. Please try asking again.]'),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

function extractString(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null || !(key in body)) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function statusForChatError(code: ChatErrorCode): number {
  switch (code) {
    case 'SESSION_NOT_FOUND':
      return 404;
    case 'INVALID_INPUT':
      return 400;
    case 'AI_ERROR':
    default:
      return 502;
  }
}

function jsonError(message: string, status: number, code?: string): Response {
  return new Response(JSON.stringify({ error: message, ...(code ? { code } : {}) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
