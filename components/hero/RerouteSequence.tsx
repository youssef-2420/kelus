"use client";

import { AnimatePresence, motion } from "motion/react";
import type { HeroPhase } from "./useHeroTimeline";

type Props = {
  phase: HeroPhase;
};

export function RerouteSequence({ phase }: Props) {
  const showLearn = phase === "learn";
  const showReroute = phase === "rerouting";
  const showUpdated = phase === "updated";

  return (
    <div className="hero-status" aria-live="polite">
      <AnimatePresence mode="wait">
        {showLearn ? (
          <motion.p
            key="learn"
            className="hero-status-label"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            New learning signal · Elasticity
          </motion.p>
        ) : null}
        {showReroute ? (
          <motion.p
            key="reroute"
            className="hero-status-label"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            Rerouting…
          </motion.p>
        ) : null}
        {showUpdated ? (
          <motion.div
            key="updated"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="hero-status-label is-live">Route updated</p>
            <p className="hero-status-note">
              Your next session changed based on what you just learned.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
