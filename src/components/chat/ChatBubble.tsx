import { cx } from '@/lib/cx';
import { Markdown } from './Markdown';

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, isStreaming }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cx('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[80%] rounded-(--clay-radius-lg) px-5 py-3 text-[15px] leading-relaxed',
          isUser
            ? 'bg-(--clay-primary) text-white shadow-[var(--clay-shadow-out-sm)]'
            : 'bg-(--clay-surface) text-(--clay-text) shadow-[var(--clay-shadow-out-sm)]',
        )}
      >
        {isUser ? (
          // The user's own message is never markdown-rendered — it's
          // exactly what they typed, so pre-wrap is the correct (and
          // simplest, safest) way to preserve their line breaks.
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <Markdown content={content} />
        )}
        {isStreaming ? (
          <span
            className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-full bg-current align-middle"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
