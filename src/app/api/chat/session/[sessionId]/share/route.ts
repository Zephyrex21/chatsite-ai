import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ChatService } from '@/lib/services/chat/chat.service';
import { ChatError } from '@/lib/services/chat/types';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { getGeminiApiKey } from '@/lib/ai/gemini-api-key';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';
import { apiRateLimit } from '@/lib/rate-limit/client';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';
import { logger } from '@/lib/logger';

const chatService = new ChatService(
  new GeminiClient(getGeminiApiKey()),
  new PrismaChatSessionRepository(),
);

/**
 * A guest (never-signed-in) session has no owner, so anyone who already
 * has its sessionId can enable sharing for it — there's no identity to
 * check ownership against in the first place, and sharing just makes that
 * same access possible without exposing the raw sessionId.
 *
 * A session created while signed in *does* have an owner: only that user
 * can enable sharing on it (enforced by ChatService.enableSharing() via
 * the same ownership check `GET /api/chat/session/[sessionId]` and
 * `POST /api/chat` use). A different signed-in user who merely learned
 * the id gets SESSION_NOT_FOUND, same as a genuinely missing session.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const identifier = resolveRateLimitIdentifier({
    userId,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await apiRateLimit.limit(identifier);
  if (!success) {
    logger.warn('rate_limit.hit', {
      route: '/api/chat/session/[sessionId]/share',
      identifier,
    });
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  try {
    const slug = await chatService.enableSharing(sessionId, userId);
    logger.info('chat_session.shared', { sessionId });
    return NextResponse.json({ shareSlug: slug, shareUrl: `/share/${slug}` });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    logger.error('chat_session.share_unexpected_error', err, { sessionId });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
