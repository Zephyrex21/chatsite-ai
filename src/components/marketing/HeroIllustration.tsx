'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The hero's signature element — deliberately not a generic blob or stock
 * "AI sparkle" icon. It depicts the product's actual mechanic: a browser
 * window with page content, connected by a single dotted path to a
 * floating chat conversation. If a viewer only ever sees this one image,
 * they should understand what the product does.
 *
 * Everything drawn "inside" the browser window is wrapped in a
 * <clipPath> keyed to the window's own rounded-rect shape. This is a
 * structural fix, not just corrected coordinates: an earlier version had
 * an animated "scanning beam" whose motion range pushed it a few pixels
 * past the window's bottom edge, so it rendered as a stray orange stripe
 * floating below the card. Clipping to the window's shape makes that
 * whole bug class impossible going forward — anything inside the window
 * group is guaranteed to stay inside it regardless of animation range,
 * even if a future edit gets a coordinate wrong again.
 *
 * All shapes use the existing --clay-* tokens so this stays in sync with
 * theme/dark-mode changes automatically.
 */
export function HeroIllustration() {
  const reduced = useReducedMotion();

  return (
    <svg
      viewBox="0 0 560 480"
      className="h-full w-full"
      role="img"
      aria-label="A browser window with page content, connected to a floating chat conversation"
    >
      <defs>
        <linearGradient id="hero-browser-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--clay-primary-tint)" />
          <stop offset="100%" stopColor="var(--clay-surface)" />
        </linearGradient>
        <clipPath id="hero-browser-clip">
          <rect x="40" y="60" width="300" height="220" rx="20" />
        </clipPath>
      </defs>

      {/* Ambient floating dots — quiet background texture, kept well clear
          of both the browser window and the chat bubbles so they never
          read as "behind" or overlapping either. */}
      {[
        { cx: 34, cy: 46, r: 5, delay: 0 },
        { cx: 540, cy: 90, r: 5, delay: 0.6 },
        { cx: 26, cy: 300, r: 4, delay: 1.1 },
      ].map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          fill="var(--clay-accent)"
          opacity={0.35}
          animate={reduced ? undefined : { cy: [dot.cy, dot.cy - 12, dot.cy] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: dot.delay }}
        />
      ))}

      {/* Browser window */}
      <motion.g
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <rect
          x="40"
          y="60"
          width="300"
          height="220"
          rx="20"
          fill="url(#hero-browser-grad)"
          stroke="var(--clay-text)"
          strokeOpacity="0.06"
        />

        {/* Everything below is clipped to the window's own rounded-rect
            shape — nothing in this group can ever render outside it. */}
        <g clipPath="url(#hero-browser-clip)">
          <rect x="40" y="60" width="300" height="40" fill="var(--clay-surface)" />
          <circle cx="62" cy="80" r="5" fill="var(--clay-danger)" opacity="0.6" />
          <circle cx="80" cy="80" r="5" fill="var(--clay-accent)" opacity="0.6" />
          <circle cx="98" cy="80" r="5" fill="var(--clay-success)" opacity="0.6" />
          <rect x="130" y="72" width="150" height="16" rx="8" fill="var(--clay-bg)" />

          {/* Page content lines */}
          <rect
            x="64"
            y="124"
            width="180"
            height="14"
            rx="7"
            fill="var(--clay-text)"
            opacity="0.14"
          />
          <rect
            x="64"
            y="150"
            width="252"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="0.09"
          />
          <rect
            x="64"
            y="168"
            width="230"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="0.09"
          />
          <rect
            x="64"
            y="186"
            width="252"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="0.09"
          />
          <rect
            x="64"
            y="212"
            width="110"
            height="34"
            rx="10"
            fill="var(--clay-primary)"
            opacity="0.16"
          />
          <rect
            x="188"
            y="212"
            width="128"
            height="34"
            rx="10"
            fill="var(--clay-text)"
            opacity="0.06"
          />

          {/* "Being read" cue — a soft pulse on the last content line,
              contained entirely within its own rect rather than a
              sweeping beam that has to be trusted to stay in bounds. */}
          <motion.rect
            x="64"
            y="186"
            width="252"
            height="10"
            rx="5"
            fill="var(--clay-accent)"
            animate={reduced ? undefined : { opacity: [0.09, 0.4, 0.09] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>
      </motion.g>

      {/* Dotted path from the page to the conversation — ends just short
          of the bubble's edge, not piercing through its middle */}
      <motion.path
        d="M 330 170 C 380 170, 380 340, 355 340"
        fill="none"
        stroke="var(--clay-accent)"
        strokeWidth="2.5"
        strokeDasharray="2 10"
        strokeLinecap="round"
        opacity="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduced ? 0.2 : 1.2, delay: reduced ? 0 : 0.5, ease: 'easeOut' }}
      />

      {/* Floating chat conversation — the answer. Bounded float range
          (±6px) chosen so the group never approaches the viewBox edges
          at either extreme of its animation. */}
      <motion.g
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduced ? 0.2 : 0.7,
          delay: reduced ? 0 : 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <motion.g
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* User question bubble */}
          <rect x="360" y="300" width="150" height="44" rx="18" fill="var(--clay-primary)" />
          <rect x="382" y="316" width="90" height="12" rx="6" fill="white" opacity="0.9" />

          {/* Assistant answer bubble */}
          <rect
            x="390"
            y="356"
            width="160"
            height="64"
            rx="18"
            fill="var(--clay-surface)"
            stroke="var(--clay-text)"
            strokeOpacity="0.06"
          />
          <rect
            x="410"
            y="372"
            width="120"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="0.16"
          />
          <rect
            x="410"
            y="390"
            width="90"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="0.1"
          />
          <rect
            x="410"
            y="406"
            width="60"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="0.1"
          />
        </motion.g>
      </motion.g>
    </svg>
  );
}
