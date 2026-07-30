import type { Prisma } from '@prisma/client';
import { prisma } from './db';

export type ChatSessionWithHistory = Prisma.ChatSessionGetPayload<{
  include: { site: true; messages: true };
}>;

/**
 * Abstraction over ChatSession + Message persistence. ChatService depends
 * on this interface, not Prisma directly, so it can be unit-tested with an
 * in-memory fake instead of a real database.
 */
export interface ChatSessionRepository {
  create(siteId: string): Promise<ChatSessionWithHistory>;
  findWithHistory(sessionId: string): Promise<ChatSessionWithHistory | null>;
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void>;
}

export class PrismaChatSessionRepository implements ChatSessionRepository {
  async create(siteId: string): Promise<ChatSessionWithHistory> {
    return prisma.chatSession.create({
      data: { siteId },
      include: { site: true, messages: true },
    });
  }

  async findWithHistory(sessionId: string): Promise<ChatSessionWithHistory | null> {
    return prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { site: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await prisma.message.create({
      data: { sessionId, role, content },
    });
  }
}
