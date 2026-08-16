'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Link2, ScanSearch, MessagesSquare } from 'lucide-react';
import { fadeUp, staggerChildren } from '@/lib/motion';

const STEPS = [
  {
    icon: Link2,
    title: 'Paste a link',
    description: 'Any public page — a docs site, a blog post, a product page. No setup required.',
  },
  {
    icon: ScanSearch,
    title: 'We read it',
    description:
      'The page is scraped and cached, so your questions are answered against the real content.',
  },
  {
    icon: MessagesSquare,
    title: 'Ask anything',
    description:
      "Get answers that stay grounded in what's actually on the page — streamed back in real time.",
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section id="how-it-works" className="relative z-10 px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp(!!reduced)}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-xs font-semibold tracking-wide text-(--clay-primary) uppercase">
            How it works
          </span>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance text-(--clay-text) sm:text-4xl">
            Three steps, no setup
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerChildren(!!reduced, 0.15)}
          className="relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6"
        >
          {/* Connecting line — desktop only, sits behind the step circles */}
          <div
            aria-hidden="true"
            className="absolute top-8 right-[16.5%] left-[16.5%] hidden h-px bg-(--clay-text-muted)/15 sm:block"
          />

          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              variants={fadeUp(!!reduced)}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-(--clay-surface) shadow-[var(--clay-shadow-out-sm)]">
                <step.icon className="h-6 w-6 text-(--clay-primary)" aria-hidden="true" />
                <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--clay-accent) text-xs font-bold text-white">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-display mt-5 text-lg font-semibold text-(--clay-text)">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[22rem] text-sm text-(--clay-text-muted)">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
