"use client";

import { motion, useReducedMotion } from "motion/react";
import styles from "./MarkStamp.module.css";

export type MarkOutcome = "success" | "partial" | "failure";

const LABEL: Record<MarkOutcome, string> = {
  success: "Solid pass",
  partial: "Partly there",
  failure: "Needs another attempt",
};

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The verdict as an ink stamp that draws itself: a full ring and tick for a pass,
 * a part-drawn ring for partly there, an open loop with a return arrow for another attempt.
 * Ink for effort, green only for a pass. Never red: this is feedback, not punishment.
 */
export function MarkStamp({ outcome, label }: { outcome: MarkOutcome; label?: string }) {
  const reduce = useReducedMotion() === true;
  const ringTo = outcome === "success" ? 1 : outcome === "partial" ? 0.62 : 0.78;
  const draw = (delay: number, duration: number) => ({
    initial: reduce ? false : { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: reduce ? { duration: 0 } : { duration, delay, ease },
  });

  return (
    <svg className={`${styles.stamp} ${styles[outcome]}`} viewBox="0 0 120 120" role="img" aria-label={label ?? LABEL[outcome]}>
      <circle className={styles.track} cx="60" cy="60" r="46" />
      <motion.circle
        className={styles.ring}
        cx="60"
        cy="60"
        r="46"
        transform="rotate(-90 60 60)"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: ringTo }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease }}
      />
      {outcome === "success" ? <motion.path className={styles.tick} d="M38 62L54 78L84 42" {...draw(0.55, 0.4)} /> : null}
      {outcome === "partial" ? (
        <>
          <motion.path className={styles.mark} d="M42 60H78" {...draw(0.55, 0.3)} />
          <motion.path className={styles.mark} d="M60 42V78" {...draw(0.7, 0.3)} />
        </>
      ) : null}
      {outcome === "failure" ? (
        <>
          <motion.path className={styles.mark} d="M76 50C70 40 56 38 47 46C38 54 40 70 52 76" {...draw(0.55, 0.45)} />
          <motion.path className={styles.mark} d="M52 76L44 70M52 76L58 68" {...draw(0.95, 0.2)} />
        </>
      ) : null}
    </svg>
  );
}
