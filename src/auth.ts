import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/repositories/db';
import { authConfig } from './auth.config';

/**
 * Adapter + JWT strategy, deliberately combined: the adapter persists
 * Users/Accounts to Postgres on sign-in (so "per-user session history"
 * has real rows to query), while JWT keeps session *verification* fast
 * and database-independent on every request. Database sessions would add
 * a Prisma query to every authenticated request and can't run outside the
 * Node.js runtime — not a real constraint here, but no reason to take on
 * the cost for no benefit.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  ...authConfig,
});
