import { NextResponse } from 'next/server';
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

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const identifier = resolveRateLimitIdentifier({
    userId: null,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await apiRateLimit.limit(identifier);
  if (!success) {
    logger.warn('rate_limit.hit', { route: '/api/share/[slug]', identifier });
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  try {
    const session = await chatService.getSharedSession(slug);
    return NextResponse.json({
      site: { url: session.site.url, title: session.site.title },
      messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    logger.error('share.get_unexpected_error', err, { slug });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
