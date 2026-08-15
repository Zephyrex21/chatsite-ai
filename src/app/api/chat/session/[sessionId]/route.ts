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

export async function GET(
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
    logger.warn('rate_limit.hit', { route: '/api/chat/session/[sessionId]', identifier });
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  try {
    const chatSession = await chatService.getSession(sessionId, userId);
    return NextResponse.json({
      sessionId: chatSession.id,
      site: { url: chatSession.site.url, title: chatSession.site.title },
      messages: chatSession.messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    logger.error('chat_session.get_unexpected_error', err, { sessionId });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
