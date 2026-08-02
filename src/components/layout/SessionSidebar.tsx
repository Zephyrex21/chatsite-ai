'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cx } from '@/lib/cx';

interface SessionSummary {
  id: string;
  site: { url: string; title: string | null };
  messageCount: number;
  updatedAt: string;
}

export function SessionSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    fetch('/api/chat/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSessions(data.sessions ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your history.');
      });

    return () => {
      cancelled = true;
    };
    // Re-fetch whenever the active chat changes, so a brand-new session
    // shows up in the list without needing a manual refresh.
  }, [status, pathname]);

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4">
      <Link href="/" onClick={onNavigate}>
        <Button variant="secondary" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Button>
      </Link>

      <div className="flex-1">
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-(--clay-text-muted) uppercase">
          History
        </h2>

        {status === 'loading' ? (
          <div className="space-y-2 px-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : status === 'unauthenticated' ? (
          <div className="rounded-(--clay-radius-md) bg-(--clay-surface) p-4 text-sm shadow-[var(--clay-shadow-in)]">
            <p className="text-(--clay-text-muted)">
              Sign in to save your conversations and pick up where you left off.
            </p>
            <Button size="md" className="mt-3 w-full" onClick={() => signIn()}>
              Sign in
            </Button>
          </div>
        ) : error ? (
          <p className="px-1 text-sm text-(--clay-danger)">{error}</p>
        ) : sessions === null ? (
          <div className="space-y-2 px-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-1 text-sm text-(--clay-text-muted)">
            No conversations yet — paste a URL to start one.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => {
              const isActive = pathname === `/chat/${session.id}`;
              return (
                <li key={session.id}>
                  <Link
                    href={`/chat/${session.id}`}
                    onClick={onNavigate}
                    className={cx(
                      'flex items-center gap-2 rounded-(--clay-radius-sm) px-3 py-2 text-sm transition-shadow',
                      isActive
                        ? 'bg-(--clay-surface) shadow-[var(--clay-shadow-in)]'
                        : 'hover:bg-(--clay-surface)/60',
                    )}
                  >
                    <MessageSquare
                      className="h-4 w-4 shrink-0 text-(--clay-text-muted)"
                      aria-hidden="true"
                    />
                    <span className="truncate">{session.site.title ?? session.site.url}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
