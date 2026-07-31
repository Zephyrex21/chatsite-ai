import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Raised (popped out, default) or inset (carved in — used for containers around input fields). */
  variant?: 'raised' | 'inset';
};

export function Card({ variant = 'raised', className, children, ...props }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-(--clay-radius-lg) bg-(--clay-surface) p-6',
        variant === 'raised' ? 'shadow-[var(--clay-shadow-out)]' : 'shadow-[var(--clay-shadow-in)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
