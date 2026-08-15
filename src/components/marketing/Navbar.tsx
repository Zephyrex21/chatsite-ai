'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10">
      <Link
        href="/"
        className="font-display text-xl font-semibold tracking-tight text-(--clay-text)"
      >
        ChatSite
      </Link>

      <nav className="hidden items-center gap-8 text-sm font-medium text-(--clay-text-muted) sm:flex">
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
            <span className="hidden text-sm text-(--clay-text-muted) sm:inline">
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
