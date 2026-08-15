import { describe, it, expect } from 'vitest';
import { fadeUp, staggerChildren } from '@/lib/motion';

describe('fadeUp', () => {
  it('animates from an offset position when motion is not reduced', () => {
    const variants = fadeUp(false);
    expect(variants.hidden).toMatchObject({ opacity: 0, y: 24 });
  });

  it('drops the y-offset when reduced motion is requested', () => {
    const variants = fadeUp(true);
    expect(variants.hidden).toEqual({ opacity: 0 });
  });

  it('uses a shorter transition duration when reduced motion is requested', () => {
    const normal = fadeUp(false).visible as { transition: { duration: number } };
    const reduced = fadeUp(true).visible as { transition: { duration: number } };
    expect(reduced.transition.duration).toBeLessThan(normal.transition.duration);
  });
});

describe('staggerChildren', () => {
  it('staggers children when motion is not reduced', () => {
    const variants = staggerChildren(false, 0.1);
    const visible = variants.visible as { transition: { staggerChildren: number } };
    expect(visible.transition.staggerChildren).toBe(0.1);
  });

  it('produces no stagger transition when reduced motion is requested', () => {
    const variants = staggerChildren(true);
    expect(variants.visible).toEqual({ transition: {} });
  });
});
