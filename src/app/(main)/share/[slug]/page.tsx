'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SitePreviewCard } from '@/components/chat/SitePreviewCard';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SharedData {
  site: { url: string; title: string | null };
  messages: Message[];
}

export default function SharedChatPage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/share/${params.slug}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'This shared conversation was not found.');
        return json;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-8 sm:px-6">
      <p className="mt-4 text-center text-sm text-(--clay-text-muted)">
        A shared, read-only conversation
      </p>

      {error ? (
        <p role="alert" className="mt-10 text-center text-(--clay-danger)">
          {error}
        </p>
      ) : data ? (
        <SitePreviewCard url={data.site.url} title={data.site.title} />
      ) : (
        <div className="flex items-center gap-4 rounded-(--clay-radius-lg) bg-(--clay-surface) p-4 shadow-[var(--clay-shadow-out)]">
          <Skeleton className="h-11 w-11 shrink-0 rounded-(--clay-radius-sm)" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      )}

      {data ? (
        <div className="flex flex-1 flex-col gap-4 py-2">
          {data.messages.map((message, index) => (
            <ChatBubble key={index} role={message.role} content={message.content} />
          ))}
        </div>
      ) : null}

      <div className="sticky bottom-4 flex justify-center">
        <Link href="/">
          <Button size="lg">Start your own conversation</Button>
        </Link>
      </div>
    </main>
  );
}
