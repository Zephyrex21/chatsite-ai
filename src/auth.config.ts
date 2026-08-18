import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

/**
 * Edge-safe half of the Auth.js config: providers and callbacks only, no
 * database adapter. Kept separate from auth.ts so this piece could run in
 * the Edge runtime if needed later — the Prisma adapter cannot.
 *
 * `allowDangerousEmailAccountLinking: true` on both providers: by
 * default, Auth.js refuses to attach a new OAuth provider to an existing
 * account that shares its email, even if that email is verified — the
 * default assumes an unverified/spoofable email elsewhere could be used
 * to hijack an account. Auth.js's own docs call the flag "dangerous" for
 * exactly that reason.
 *
 * That default risk doesn't really apply here: GitHub and Google both
 * only return emails they've themselves verified (GitHub requires a
 * verified primary email to be shared via OAuth at all; Google only
 * returns verified addresses), so there's no unverified-email spoofing
 * vector between these two specific providers. Without this flag, a
 * person who signs up with GitHub can never also sign in with Google
 * using the same address — they'd hit OAuthAccountNotLinked every time,
 * which is a worse experience than the linking risk here is real.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
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
