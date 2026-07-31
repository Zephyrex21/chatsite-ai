import { NextResponse } from 'next/server';
import { ChatService } from '@/lib/services/chat/chat.service';
import { ChatError } from '@/lib/services/chat/types';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { PrismaChatSessionRepository } from '@/lib/repositories/chat-session.repository';

const chatService = new ChatService(
  new GeminiClient(process.env.GEMINI_API_KEY ?? ''),
  new PrismaChatSessionRepository(),
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  try {
    const session = await chatService.getSession(sessionId);
    return NextResponse.json({
      sessionId: session.id,
      site: { url: session.site.url, title: session.site.title },
      messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    console.error('Unexpected /api/chat/session/[sessionId] error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
