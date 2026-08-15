'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Radar, Zap, History, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { fadeUp, staggerChildren } from '@/lib/motion';

interface Feature {
  icon: typeof Radar;
  title: string;
  description: string;
}

// Every line here describes something actually built and shipped —
// scraping, streaming, history, sharing, security headers, markdown —
// not aspirational marketing copy for features that don't exist yet.
const FEATURES: Feature[] = [
  {
    icon: Radar,
    title: 'Grounded in the real page',
    description:
      "Every answer is checked against the page's actual content — no filling in gaps with a guess.",
  },
  {
    icon: Zap,
    title: 'Streams as it thinks',
    description: 'Answers appear word by word while they\u2019re generated, not after a long wait.',
  },
  {
    icon: History,
    title: 'Remembers your conversations',
    description: 'Sign in once, and every chat you\u2019ve started is right where you left it.',
  },
  {
    icon: Share2,
    title: 'Share what you found',
    description: 'Turn any conversation into a link — no account needed for whoever opens it.',
  },
  {
    icon: Sparkles,
    title: 'Reads formatting, not just text',
    description:
      'Lists, bold text, and code blocks render properly instead of showing raw symbols.',
  },
  {
    icon: ShieldCheck,
    title: 'Built with security in mind',
    description:
      'Rate limiting, strict headers, and session ownership checks run on every request.',
  },
];

export function FeaturesSection() {
  const reduced = useReducedMotion();

  return (
    <section id="features" className="relative z-10 px-6 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp(!!reduced)}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-xs font-semibold tracking-wide text-(--clay-accent-dark) uppercase">
            What it does
          </span>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance text-(--clay-text) sm:text-4xl">
            Everything you need to actually understand a page
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerChildren(!!reduced)}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp(!!reduced)}
              whileHover={reduced ? undefined : { y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-(--clay-radius-lg) bg-(--clay-surface) p-6 shadow-[var(--clay-shadow-out-sm)] transition-shadow hover:shadow-[var(--clay-shadow-out)]"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-(--clay-radius-md) bg-(--clay-primary-tint) text-(--clay-primary)">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold text-(--clay-text)">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-(--clay-text-muted)">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
