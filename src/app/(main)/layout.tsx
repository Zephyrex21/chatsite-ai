'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { SessionSidebar } from '@/components/layout/SessionSidebar';
import { cx } from '@/lib/cx';

export default function MainLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop: persistent sidebar */}
      <div className="hidden w-72 shrink-0 border-r border-(--clay-text-muted)/10 md:block">
        <SessionSidebar />
      </div>

      {/* Mobile: slide-in drawer + backdrop */}
      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-(--clay-bg) shadow-[var(--clay-shadow-out)]">
            <SessionSidebar onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className={cx('flex min-h-full flex-1 flex-col', isSidebarOpen && 'overflow-hidden')}>
        <Header onToggleSidebar={() => setIsSidebarOpen((open) => !open)} />
        {children}
      </div>
    </div>
  );
}
