import { cx } from '@/lib/cx';

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
          'max-w-[80%] rounded-(--clay-radius-lg) px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-(--clay-primary) text-white shadow-[var(--clay-shadow-out-sm)]'
            : 'bg-(--clay-surface) text-(--clay-text) shadow-[var(--clay-shadow-out-sm)]',
        )}
      >
        {content}
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
