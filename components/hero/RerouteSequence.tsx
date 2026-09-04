"use client";

import { AnimatePresence, motion } from "motion/react";
import type { HeroPhase } from "./useHeroTimeline";

type Props = {
  phase: HeroPhase;
};

const fade = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export function RerouteSequence({ phase }: Props) {
  const copy =
    phase === "learn"
      ? "Elasticity · 42% → 46%"
      : phase === "rerouting"
        ? "Rerouting"
        : phase === "updated"
          ? "Now via Monetary Policy"
          : null;

  if (!copy) return <div className="hero-status" aria-live="polite" />;

  return (
    <div className="hero-status" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p key={copy} className="hero-status-label" {...fade}>
          {copy}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
