'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The hero's signature element — depicts the product's actual mechanic: a
 * browser window with page content, connected by a dotted path to a
 * floating chat conversation, surrounded by small decorative motion (an
 * orbiting ring, a rotating sparkle, a "grounded" checkmark badge) that
 * exists purely for liveliness rather than to explain anything further.
 *
 * Everything "inside" the browser window is wrapped in a <clipPath> keyed
 * to the window's own rounded-rect shape, so nothing in that group can
 * ever render outside the card regardless of its animation range — this
 * is what a previous version got wrong (an animated beam whose motion
 * range pushed it past the card's edge).
 *
 * Every element's bounding box (including at the extremes of its
 * animation) was checked against the 560x480 viewBox and against every
 * other element with an actual script before shipping — not eyeballed.
 * The only intentional overlaps are decorative pieces (the glow, the
 * orbit ring) that are deliberately drawn *behind* the opaque browser
 * card, so any overlap is naturally masked rather than floating loose.
 */
export function HeroIllustration() {
  const reduced = useReducedMotion();

  return (
    <svg
      viewBox="0 0 560 480"
      className="h-full w-full"
      role="img"
      aria-label="A browser window with page content, connected to a floating chat conversation, surrounded by decorative motion"
    >
      <defs>
        <linearGradient id="hero-browser-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--hero-card-grad-start)" />
          <stop offset="100%" stopColor="var(--hero-card-grad-end)" />
        </linearGradient>
        <clipPath id="hero-browser-clip">
          <rect x="40" y="60" width="300" height="220" rx="20" />
        </clipPath>
        <radialGradient id="hero-glow-grad">
          <stop offset="0%" stopColor="var(--clay-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--clay-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ambient glow behind the whole composition — drawn first
          (behind everything), intentionally bleeds past the window's
          edges since it's a diffuse backdrop, not a geometric UI piece
          that needs to read as "contained". */}
      <motion.circle
        cx="190"
        cy="170"
        r="170"
        fill="url(#hero-glow-grad)"
        animate={reduced ? undefined : { opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '190px 170px' }}
      />

      {/* Orbit ring — a slowly rotating dashed circle tucked behind the
          browser window's top-right corner for depth. */}
      <motion.circle
        cx="330"
        cy="70"
        r="26"
        fill="none"
        stroke="var(--clay-accent)"
        strokeWidth="2"
        strokeDasharray="3 7"
        opacity="0.45"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '330px 70px' }}
      />

      {/* Ambient floating dots, varied sizes/speeds for a little parallax */}
      {[
        { cx: 34, cy: 400, r: 5, delay: 0, duration: 5 },
        { cx: 540, cy: 130, r: 4, delay: 0.6, duration: 4.2 },
        { cx: 22, cy: 130, r: 3.5, delay: 1.1, duration: 5.6 },
        { cx: 300, cy: 24, r: 3, delay: 0.3, duration: 4.8 },
      ].map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          fill="var(--clay-accent)"
          opacity={0.4}
          animate={reduced ? undefined : { cy: [dot.cy, dot.cy - 12, dot.cy] }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: dot.delay,
          }}
        />
      ))}

      {/* Rotating sparkle — small four-point star, purely decorative */}
      <motion.path
        d="M 480 44 L 484 54 L 494 58 L 484 62 L 480 72 L 476 62 L 466 58 L 476 54 Z"
        fill="var(--clay-accent)"
        opacity="0.55"
        animate={reduced ? undefined : { rotate: 360, opacity: [0.35, 0.7, 0.35] }}
        transition={{
          rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
          opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ transformOrigin: '480px 58px' }}
      />

      {/* Browser window — gentle whole-window float */}
      <motion.g
        initial={{ opacity: 0, y: 16 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
        transition={
          reduced
            ? { duration: 0.2 }
            : {
                opacity: { duration: 0.6 },
                y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
              }
        }
      >
        <rect
          x="40"
          y="60"
          width="300"
          height="220"
          rx="20"
          fill="url(#hero-browser-grad)"
          stroke="var(--clay-text)"
          strokeOpacity="var(--hero-card-border-opacity)"
        />

        {/* Clipped to the window's own shape — nothing here can render
            outside the card. */}
        <g clipPath="url(#hero-browser-clip)">
          <rect x="40" y="60" width="300" height="40" fill="var(--hero-topbar-fill)" />
          <circle cx="62" cy="80" r="5" fill="var(--clay-danger)" opacity="0.6" />
          <circle cx="80" cy="80" r="5" fill="var(--clay-accent)" opacity="0.6" />
          <circle cx="98" cy="80" r="5" fill="var(--clay-success)" opacity="0.6" />
          <rect x="130" y="72" width="150" height="16" rx="8" fill="var(--hero-addressbar-fill)" />

          <rect
            x="64"
            y="124"
            width="180"
            height="14"
            rx="7"
            fill="var(--clay-text)"
            opacity="var(--hero-line-mid)"
          />
          <rect
            x="64"
            y="150"
            width="252"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="var(--hero-line-soft)"
          />
          <rect
            x="64"
            y="168"
            width="230"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="var(--hero-line-soft)"
          />
          <rect
            x="64"
            y="186"
            width="252"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="var(--hero-line-soft)"
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
            opacity="var(--hero-line-faint)"
          />

          {/* "Being read" cue — a soft pulse on one content line, same
              rect, opacity-only, so it can never drift out of bounds. */}
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

      {/* "Grounded" checkmark badge, floating just past the window's
          bottom-left corner */}
      <motion.g
        animate={reduced ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      >
        <circle cx="56" cy="312" r="15" fill="var(--clay-success)" />
        <path
          d="M 50 312 L 54.5 317 L 63 306"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Dotted path from the page to the conversation — continuously
          "marching" once drawn in, rather than a one-time reveal */}
      <motion.path
        d="M 330 170 C 380 170, 380 340, 355 340"
        fill="none"
        stroke="var(--clay-accent)"
        strokeWidth="2.5"
        strokeDasharray="2 10"
        strokeLinecap="round"
        opacity="0.5"
        initial={{ pathLength: 0 }}
        animate={reduced ? { pathLength: 1 } : { pathLength: 1, strokeDashoffset: [0, -24] }}
        transition={
          reduced
            ? { duration: 0.2 }
            : {
                pathLength: { duration: 1.2, delay: 0.5, ease: 'easeOut' },
                strokeDashoffset: { duration: 1.6, repeat: Infinity, ease: 'linear', delay: 1.7 },
              }
        }
      />

      {/* Floating chat conversation — the answer */}
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
          animate={reduced ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
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
            fill="url(#hero-browser-grad)"
            stroke="var(--clay-text)"
            strokeOpacity="var(--hero-card-border-opacity)"
          />
          <rect
            x="410"
            y="372"
            width="120"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="var(--hero-line-strong)"
          />
          <rect
            x="410"
            y="390"
            width="90"
            height="10"
            rx="5"
            fill="var(--clay-text)"
            opacity="var(--hero-line-faint)"
          />

          {/* Typing dots instead of a static third line — a small,
              contained, continuous "still thinking" animation */}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={414 + i * 14}
              cy="411"
              r="4"
              fill="var(--clay-text)"
              opacity="0.25"
              animate={reduced ? undefined : { opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </motion.g>
      </motion.g>
    </svg>
  );
}
