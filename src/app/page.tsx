'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Enter a URL to get started.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong. Try a different URL.');
        setIsLoading(false);
        return;
      }

      router.push(`/chat/${data.sessionId}`);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      {/* Signature element: soft floating clay blobs — a literal reading of
          "claymorphism" rather than just soft-shadow cards. Respects
          prefers-reduced-motion via the global rule in globals.css. */}
      <div
        aria-hidden="true"
        className="clay-blob pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-(--clay-primary)/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="clay-blob pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-(--clay-accent)/20 blur-3xl"
        style={{ animationDelay: '-7s' }}
      />

      <Header />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-(--clay-text) sm:text-5xl">
            Chat with any website
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-(--clay-text-muted)">
            Paste a URL and ask it questions — answers stay grounded in what&apos;s actually on the
            page.
          </p>

          <Card variant="raised" className="mt-10 p-4 sm:p-6">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 sm:flex-row sm:items-start"
            >
              <TextInput
                label="Website URL"
                hideLabel
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                error={error ?? undefined}
                disabled={isLoading}
                className="sm:flex-1"
              />
              <Button type="submit" size="lg" isLoading={isLoading} className="sm:shrink-0">
                {!isLoading && (
                  <>
                    Start chatting
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
                {isLoading && 'Reading the page…'}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
