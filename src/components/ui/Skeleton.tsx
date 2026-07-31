import { cx } from '@/lib/cx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="presentation"
      className={cx(
        'animate-pulse rounded-(--clay-radius-sm) bg-(--clay-text-muted)/15',
        className,
      )}
    />
  );
}

/** Skeleton shape for the "scraping the page..." loading state. */
export function ScrapeLoadingSkeleton() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
