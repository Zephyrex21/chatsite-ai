import { describe, it, expect } from 'vitest';
import { cx } from '@/lib/cx';

describe('cx', () => {
  it('joins multiple truthy class strings with a space', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('skips false, null, and undefined values', () => {
    expect(cx('a', false, 'b', null, 'c', undefined)).toBe('a b c');
  });

  it('supports conditional class expressions', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cx('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(false, null, undefined)).toBe('');
  });
});
