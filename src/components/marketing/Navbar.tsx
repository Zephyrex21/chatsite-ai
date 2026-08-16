'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { cx } from '@/lib/cx';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'sticky top-0 z-20 flex w-full items-center justify-between px-6 py-5 transition-all duration-300 sm:px-10',
        scrolled
          ? 'border-b border-(--clay-text-muted)/10 bg-(--clay-bg)/80 shadow-[var(--clay-shadow-out-sm)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Link
        href="/"
        className="font-display text-xl font-semibold tracking-tight text-(--clay-text)"
      >
        ChatSite
      </Link>

      <nav className="hidden items-center gap-8 text-sm font-medium text-(--clay-text-muted) sm:flex">
        <a href="#how-it-works" className="transition-colors hover:text-(--clay-text)">
          How it works
        </a>
        <a href="#features" className="transition-colors hover:text-(--clay-text)">
          Features
        </a>
        <a
          href="https://github.com/Zephyrex21/chatsite-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-(--clay-text)"
        >
          GitHub
        </a>
      </nav>

      <div className="flex items-center gap-3">
        {status === 'authenticated' ? (
          <>
            <span className="hidden max-w-[10rem] truncate text-sm text-(--clay-text-muted) sm:inline">
              {session.user?.name ?? session.user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </Button>
          </>
        ) : status === 'unauthenticated' ? (
          <Button variant="secondary" size="md" onClick={() => signIn()}>
            Sign in
          </Button>
        ) : (
          <div className="h-11 w-20" aria-hidden="true" />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
