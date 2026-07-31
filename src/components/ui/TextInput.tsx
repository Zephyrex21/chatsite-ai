'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Visually hides the label while keeping it in the accessibility tree. */
  hideLabel?: boolean;
  error?: string;
};

/**
 * Inputs use the inset shadow (look carved into the surface) — the
 * opposite of buttons/cards, which are raised. That contrast is what
 * makes claymorphism read as a coherent physical metaphor rather than
 * "everything has a soft shadow."
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hideLabel, error, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cx(
          'h-14 w-full rounded-(--clay-radius-md) bg-(--clay-surface) px-5 text-base text-(--clay-text)',
          'shadow-[var(--clay-shadow-in)] transition-shadow duration-150 outline-none',
          'placeholder:text-(--clay-text-muted)',
          error && 'shadow-[0_0_0_2px_var(--clay-danger)_inset]',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-(--clay-danger)">
          {error}
        </p>
      ) : null}
    </div>
  );
});
