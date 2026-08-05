'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Auth.js passes both of these as query params to a custom sign-in page:
 * callbackUrl (where to return the user after a successful sign-in) and
 * error (set if a previous sign-in attempt failed).
 */
export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const hasError = searchParams.has('error');

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <Card variant="raised" className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-xl font-semibold text-(--clay-text)">
          ChatSite
        </Link>

        <h1 className="font-display mt-6 text-2xl font-semibold text-(--clay-text)">Sign in</h1>
        <p className="mt-2 text-sm text-(--clay-text-muted)">
          Save your conversations and pick up where you left off.
        </p>

        {hasError ? (
          <p role="alert" className="mt-4 text-sm text-(--clay-danger)">
            Something went wrong signing you in. Please try again.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" size="lg" onClick={() => signIn('github', { callbackUrl })}>
            Continue with GitHub
          </Button>
          <Button variant="secondary" size="lg" onClick={() => signIn('google', { callbackUrl })}>
            Continue with Google
          </Button>
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-sm text-(--clay-text-muted) underline underline-offset-2"
        >
          Continue as a guest instead
        </Link>
      </Card>
    </main>
  );
}
