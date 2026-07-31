import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  return (
    <header className="flex w-full items-center justify-between px-6 py-5 sm:px-10">
      <Link
        href="/"
        className="font-display text-xl font-semibold tracking-tight text-(--clay-text)"
      >
        ChatSite
      </Link>
      <ThemeToggle />
    </header>
  );
}
