'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-end gap-3">
      <label htmlFor="chat-composer-input" className="sr-only">
        Ask a question about this page
      </label>
      <textarea
        id="chat-composer-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder="Ask a question about this page…"
        rows={1}
        disabled={disabled}
        className={cx(
          'max-h-40 min-h-14 flex-1 resize-none rounded-(--clay-radius-md) bg-(--clay-surface) px-5 py-4 text-base',
          'shadow-[var(--clay-shadow-in)] outline-none placeholder:text-(--clay-text-muted)',
          'disabled:opacity-60',
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </Button>
    </form>
  );
}
