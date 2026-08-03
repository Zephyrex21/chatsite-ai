'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { digest: error.digest, boundary: 'main' } });
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card variant="raised" className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-(--clay-text)">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-(--clay-text-muted)">
          The error has been reported. You can try again, or head back to the homepage.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </Card>
    </main>
  );
}
