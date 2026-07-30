import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

/**
 * Edge-safe half of the Auth.js config: providers and callbacks only, no
 * database adapter. Kept separate from auth.ts so this piece could run in
 * the Edge runtime if needed later — the Prisma adapter cannot.
 */
export const authConfig: NextAuthConfig = {
  providers: [GitHub, Google],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    // JWT strategy's default session doesn't include the user's database
    // id — attach it explicitly so route handlers can use it directly
    // (e.g. to link a new ChatSession to the signed-in user).
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
