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

export async function GET(
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
    const chatSession = await chatService.getSession(sessionId);
    return NextResponse.json({
      sessionId: chatSession.id,
      site: { url: chatSession.site.url, title: chatSession.site.title },
      messages: chatSession.messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    console.error('Unexpected /api/chat/session/[sessionId] error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
