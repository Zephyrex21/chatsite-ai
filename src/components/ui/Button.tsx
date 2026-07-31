'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-(--clay-primary) text-white',
  secondary: 'bg-(--clay-surface) text-(--clay-text)',
  ghost: 'bg-transparent text-(--clay-text) shadow-none hover:bg-(--clay-surface)',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
  icon: 'h-11 w-11 p-0',
};

/**
 * The core claymorphic interaction: raised by default, swaps to the inset
 * "pressed" shadow on :active. This swap is the single detail that makes
 * claymorphism read as tactile rather than just "soft drop shadow."
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-(--clay-radius-md) font-semibold',
        'shadow-[var(--clay-shadow-out-sm)] transition-all duration-150 ease-out',
        'active:scale-[0.98] active:shadow-[var(--clay-shadow-pressed)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
});
