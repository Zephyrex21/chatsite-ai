import { ChatService } from '@/lib/services/chat/chat.service';
import { ChatError, type ChatErrorCode } from '@/lib/services/chat/types';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';

const chatService = new ChatService(
  new GeminiClient(process.env.GEMINI_API_KEY ?? ''),
  new PrismaChatSessionRepository(),
);

export async function POST(request: Request) {
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

  const generator = chatService.ask(sessionId, question);

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
      return jsonError(err.message, statusForChatError(err.code), err.code);
    }
    console.error('Unexpected /api/chat error:', err);
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
      } catch (err) {
        console.error('Gemini stream interrupted mid-response:', err);
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
