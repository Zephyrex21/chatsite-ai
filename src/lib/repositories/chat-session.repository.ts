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
  create(siteId: string, userId?: string | null): Promise<ChatSessionWithHistory>;
  findWithHistory(sessionId: string): Promise<ChatSessionWithHistory | null>;
  findByUser(userId: string): Promise<ChatSessionWithHistory[]>;
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void>;
  enableSharing(sessionId: string): Promise<string>;
  findByShareSlug(slug: string): Promise<ChatSessionWithHistory | null>;
}

export class PrismaChatSessionRepository implements ChatSessionRepository {
  async create(siteId: string, userId?: string | null): Promise<ChatSessionWithHistory> {
    return prisma.chatSession.create({
      data: { siteId, userId: userId ?? null },
      include: { site: true, messages: true },
    });
  }

  async findWithHistory(sessionId: string): Promise<ChatSessionWithHistory | null> {
    return prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { site: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async findByUser(userId: string): Promise<ChatSessionWithHistory[]> {
    return prisma.chatSession.findMany({
      where: { userId },
      include: { site: true, messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    // A bare `message.create()` never touches the parent ChatSession row,
    // so its `@updatedAt` (which findByUser's "most recent first" sort
    // relies on) would otherwise only reflect creation time — an old
    // session with hours of ongoing activity would never re-sort above a
    // session someone merely just started. The transaction keeps both
    // writes atomic so a failure can't leave the message saved but the
    // session's recency stale.
    await prisma.$transaction([
      prisma.message.create({ data: { sessionId, role, content } }),
      prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } }),
    ]);
  }

  async enableSharing(sessionId: string): Promise<string> {
    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { shareSlug: true },
    });

    if (existing?.shareSlug) {
      return existing.shareSlug;
    }

    const slug = generateShareSlug();
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { isShared: true, shareSlug: slug },
    });

    return slug;
  }

  async findByShareSlug(slug: string): Promise<ChatSessionWithHistory | null> {
    return prisma.chatSession.findFirst({
      where: { shareSlug: slug, isShared: true },
      include: { site: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
}

/**
 * Short, URL-safe, unguessable-enough slug for a share link. Not a
 * cryptographic secret (share links are meant to be shareable), just
 * long enough that someone can't enumerate other people's conversations.
 */
function generateShareSlug(): string {
  return Array.from({ length: 12 }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)),
  ).join('');
}
