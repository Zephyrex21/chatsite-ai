'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { HeroIllustration } from './HeroIllustration';
import { fadeUp } from '@/lib/motion';
import { withUserGeminiKeyHeader } from '@/lib/user-gemini-key';

export function Hero() {
  const router = useRouter();
  const reduced = useReducedMotion();
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
        headers: withUserGeminiKeyHeader({ 'Content-Type': 'application/json' }),
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
    <section className="relative overflow-hidden">
      {/* Signature element: soft floating clay blobs, unchanged from the
          original homepage — a literal reading of "claymorphism" that's
          worth keeping as-is rather than replacing. */}
      <div
        aria-hidden="true"
        className="clay-blob pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-(--clay-primary)/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="clay-blob pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-(--clay-accent)/20 blur-3xl"
        style={{ animationDelay: '-7s' }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp(!!reduced)}
          className="text-center lg:text-left"
        >
          <span className="inline-block rounded-full bg-(--clay-primary-tint) px-4 py-1.5 text-xs font-semibold tracking-wide text-(--clay-primary) uppercase">
            Grounded AI, not guesswork
          </span>
          <h1 className="font-display mt-5 text-4xl font-semibold tracking-tight text-balance text-(--clay-text) sm:text-5xl lg:text-6xl">
            Chat with any website
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-(--clay-text-muted) lg:mx-0">
            Paste a URL and ask it questions — answers stay grounded in what&apos;s actually on the
            page.
          </p>

          <Card variant="raised" className="mt-8 p-4 sm:p-6">
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

          <p className="mt-4 text-sm text-(--clay-text-muted)">
            No sign-up required to try it · Sign in to keep your chat history
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduced ? 0.2 : 0.8,
            delay: reduced ? 0 : 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mx-auto aspect-[7/6] w-full max-w-lg"
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
