'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { fadeUp, staggerChildren } from '@/lib/motion';

interface SessionSummary {
  id: string;
  site: { url: string; title: string | null };
  messageCount: number;
  updatedAt: string;
}

/**
 * Addresses a real gap: chat history was only ever visible inside the
 * sidebar on a `/chat/[id]` page. A signed-in user landing on the
 * homepage — the most common way to arrive after signing back in — had
 * no visible confirmation their past conversations were still there
 * until they started a brand-new one. This makes that persistence
 * actually discoverable, not just technically present in the database.
 *
 * Renders nothing for guests or users with no history yet — this is a
 * bonus for returning users, not a section that should compete with the
 * hero for a first-time visitor.
 */
export function RecentChats() {
  const { status } = useSession();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    fetch('/api/chat/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSessions(data.sessions ?? []);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated' || !sessions || sessions.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={staggerChildren(!!reduced)}
      className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-4"
    >
      <motion.h2
        variants={fadeUp(!!reduced)}
        className="mb-4 px-1 text-sm font-semibold tracking-wide text-(--clay-text-muted) uppercase"
      >
        Continue where you left off
      </motion.h2>
      <div className="flex flex-col gap-2">
        {sessions.slice(0, 4).map((session) => (
          <motion.div key={session.id} variants={fadeUp(!!reduced)}>
            <Link
              href={`/chat/${session.id}`}
              className="group flex items-center gap-3 rounded-(--clay-radius-md) bg-(--clay-surface) px-4 py-3 shadow-[var(--clay-shadow-out-sm)] transition-shadow hover:shadow-[var(--clay-shadow-out)]"
            >
              <MessageSquare
                className="h-4 w-4 shrink-0 text-(--clay-text-muted)"
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-sm text-(--clay-text)">
                {session.site.title ?? session.site.url}
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-(--clay-text-muted) transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
