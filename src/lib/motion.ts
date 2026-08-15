import type { Variants } from 'framer-motion';

/**
 * globals.css's `prefers-reduced-motion` rule only catches CSS
 * transitions/animations — it has no effect on framer-motion's
 * JS-driven transforms. Every motion component in the marketing pages
 * calls `useReducedMotion()` (from framer-motion) and passes the result
 * to these factories, so a "reduce motion" OS setting actually removes
 * movement here too, not just shrinks its duration.
 */

export function fadeUp(reduced: boolean): Variants {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };
}

export function staggerChildren(reduced: boolean, stagger = 0.08): Variants {
  return {
    hidden: {},
    visible: {
      transition: reduced ? {} : { staggerChildren: stagger, delayChildren: 0.05 },
    },
  };
}
