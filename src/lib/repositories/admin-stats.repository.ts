import { prisma } from './db';

export interface UsageStats {
  totalUsers: number;
  totalScrapedSites: number;
  totalChatSessions: number;
  totalMessages: number;
  sharedSessionCount: number;
}

export async function getUsageStats(): Promise<UsageStats> {
  const [totalUsers, totalScrapedSites, totalChatSessions, totalMessages, sharedSessionCount] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.scrapedSite.count(),
      prisma.chatSession.count(),
      prisma.message.count(),
      prisma.chatSession.count({ where: { isShared: true } }),
    ]);

  return { totalUsers, totalScrapedSites, totalChatSessions, totalMessages, sharedSessionCount };
}
