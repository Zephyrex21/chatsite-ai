import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ChatService } from '@/lib/services/chat/chat.service';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';
import { apiRateLimit } from '@/lib/rate-limit/client';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';

const chatService = new ChatService(
  new GeminiClient(process.env.GEMINI_API_KEY ?? ''),
  new PrismaChatSessionRepository(),
);

/**
 * Session history is only meaningful for signed-in users — a guest
 * session has no account to attach history to, so this route requires
 * auth rather than silently returning an empty list (which could look
 * like a bug rather than an intentional guest-mode limitation).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in to view your chat history.' }, { status: 401 });
  }

  const identifier = resolveRateLimitIdentifier({
    userId: session.user.id,
    ip: request.headers.get('x-forwarded-for'),
  });
  const { success } = await apiRateLimit.limit(identifier);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const sessions = await chatService.listSessionsForUser(session.user.id);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      site: { url: s.site.url, title: s.site.title },
      messageCount: s.messages.length,
      updatedAt: s.updatedAt,
    })),
  });
}
