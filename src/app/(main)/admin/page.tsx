'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface UsageStats {
  totalUsers: number;
  totalScrapedSites: number;
  totalChatSessions: number;
  totalMessages: number;
  sharedSessionCount: number;
}

const STAT_LABELS: Array<{ key: keyof UsageStats; label: string }> = [
  { key: 'totalUsers', label: 'Signed-up users' },
  { key: 'totalScrapedSites', label: 'Sites scraped (cached)' },
  { key: 'totalChatSessions', label: 'Chat sessions' },
  { key: 'totalMessages', label: 'Messages exchanged' },
  { key: 'sharedSessionCount', label: 'Conversations shared' },
];

export default function AdminPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Not authorized.');
        return data;
      })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-(--clay-text)">Usage stats</h1>
      <p className="mt-1 text-sm text-(--clay-text-muted)">
        A rough product-health snapshot, not a full analytics dashboard.
      </p>

      {error ? (
        <p role="alert" className="mt-8 text-(--clay-danger)">
          {error}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STAT_LABELS.map(({ key, label }) => (
            <Card key={key} variant="raised" className="flex flex-col gap-1">
              <span className="text-sm text-(--clay-text-muted)">{label}</span>
              {stats ? (
                <span className="font-display text-3xl font-semibold text-(--clay-text)">
                  {stats[key].toLocaleString()}
                </span>
              ) : (
                <Skeleton className="h-9 w-20" />
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
