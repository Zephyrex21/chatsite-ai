'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Next.js's most outer error boundary — only triggers if an error escapes
 * even the root layout, which is rare but possible. Must render its own
 * <html>/<body> since it replaces the entire root layout when active.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { digest: error.digest, boundary: 'global' } });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>The error has been reported. Please refresh the page.</p>
        </div>
      </body>
    </html>
  );
}
