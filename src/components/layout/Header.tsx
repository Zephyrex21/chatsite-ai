'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';

export function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { data: session, status } = useSession();

  return (
    <header className="flex w-full items-center justify-between px-6 py-5 sm:px-10">
      <div className="flex items-center gap-3">
        {onToggleSidebar ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle history sidebar"
            className="md:hidden"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : null}
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-(--clay-text)"
        >
          ChatSite
        </Link>
      </div>

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
          // status === 'loading' — reserve the space so nothing jumps
          <div className="h-11 w-20" aria-hidden="true" />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
