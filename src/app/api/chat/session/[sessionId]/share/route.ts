import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ChatService } from '@/lib/services/chat/chat.service';
import { ChatError } from '@/lib/services/chat/types';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';
import { apiRateLimit } from '@/lib/rate-limit/client';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';

const chatService = new ChatService(
  new GeminiClient(process.env.GEMINI_API_KEY ?? ''),
  new PrismaChatSessionRepository(),
);

/**
 * Anyone who already has a sessionId can enable sharing for it — the same
 * trust boundary the rest of the app already uses (a session's contents
 * are accessible to anyone who knows its id, guest or signed-in; sharing
 * just makes that access possible without exposing the raw sessionId).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const session = await auth();
  const identifier = resolveRateLimitIdentifier({
    userId: session?.user?.id ?? null,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await apiRateLimit.limit(identifier);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  try {
    const slug = await chatService.enableSharing(sessionId);
    return NextResponse.json({ shareSlug: slug, shareUrl: `/share/${slug}` });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    console.error('Unexpected /api/chat/session/[sessionId]/share error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
