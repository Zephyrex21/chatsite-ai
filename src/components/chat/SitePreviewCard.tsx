import { Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface SitePreviewCardProps {
  url: string;
  title: string | null;
}

export function SitePreviewCard({ url, title }: SitePreviewCardProps) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // fall back to showing the raw url string if it's somehow not parseable
  }

  return (
    <Card variant="raised" className="flex items-center gap-4 p-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--clay-radius-sm) bg-(--clay-primary-tint) text-(--clay-primary)"
        aria-hidden="true"
      >
        <Globe className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-base font-medium text-(--clay-text)">
          {title ?? hostname}
        </p>
        <p className="truncate text-sm text-(--clay-text-muted)">{url}</p>
      </div>
    </Card>
  );
}
