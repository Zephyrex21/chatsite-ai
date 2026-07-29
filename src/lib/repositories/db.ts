import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma 7 requires a driver adapter for all databases (no more zero-config
 * `new PrismaClient()`). This also gives us direct control over the
 * underlying `pg` connection pool.
 *
 * The global-singleton pattern below prevents Next.js's dev-mode hot reload
 * from spawning a new connection pool on every file save.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
