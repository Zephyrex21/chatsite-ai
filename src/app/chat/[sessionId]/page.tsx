'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { SitePreviewCard } from '@/components/chat/SitePreviewCard';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { Skeleton } from '@/components/ui/Skeleton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionData {
  sessionId: string;
  site: { url: string; title: string | null };
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(`/api/chat/session/${sessionId}`);
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) setLoadError(data.error ?? 'Could not load this conversation.');
          return;
        }
        if (!cancelled) {
          setSession(data);
          setMessages(data.messages ?? []);
        }
      } catch {
        if (!cancelled) setLoadError('Could not reach the server. Check your connection.');
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(question: string) {
    setAskError(null);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsAsking(true);

    // Placeholder assistant bubble that fills in as the stream arrives.
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        setAskError(data?.error ?? 'The AI did not respond. Try asking again.');
        setMessages((prev) => prev.slice(0, -1)); // drop the empty placeholder
        setIsAsking(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
      }
    } catch {
      setAskError('The connection was interrupted. Try asking again.');
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-8 sm:px-6">
        {loadError ? (
          <p role="alert" className="mt-10 text-center text-(--clay-danger)">
            {loadError}
          </p>
        ) : session ? (
          <SitePreviewCard url={session.site.url} title={session.site.title} />
        ) : (
          <div className="flex items-center gap-4 rounded-(--clay-radius-lg) bg-(--clay-surface) p-4 shadow-[var(--clay-shadow-out)]">
            <Skeleton className="h-11 w-11 shrink-0 rounded-(--clay-radius-sm)" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-2" aria-live="polite">
          {messages.length === 0 && session ? (
            <p className="mt-8 text-center text-(--clay-text-muted)">
              Ask anything about {session.site.title ?? session.site.url}.
            </p>
          ) : null}
          {messages.map((message, index) => (
            <ChatBubble
              key={index}
              role={message.role}
              content={message.content}
              isStreaming={
                isAsking && index === messages.length - 1 && message.role === 'assistant'
              }
            />
          ))}
          <div ref={scrollAnchorRef} />
        </div>

        {askError ? (
          <p role="alert" className="text-center text-sm text-(--clay-danger)">
            {askError}
          </p>
        ) : null}

        <div className="sticky bottom-4">
          <ChatComposer onSend={handleSend} disabled={isAsking || !session} />
        </div>
      </main>
    </div>
  );
}
