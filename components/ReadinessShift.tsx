"use client";

import { motion, useReducedMotion } from "motion/react";
import styles from "./ReadinessShift.module.css";

/**
 * Estimated readiness before and after a session, with the exam target marked.
 * It is an estimate from the learner's answers, so it says so; a dip is shown as plainly as a gain.
 */
export function ReadinessShift({ before, after, targetPercent }: { before: number; after: number; targetPercent: number }) {
  const reduce = useReducedMotion() === true;
  const from = Math.round(Math.max(0, Math.min(1, before)) * 100);
  const to = Math.round(Math.max(0, Math.min(1, after)) * 100);
  const target = Math.round(Math.max(0, Math.min(100, targetPercent)));
  const delta = to - from;
  const note = delta > 0 ? `Up ${delta} point${delta === 1 ? "" : "s"} from your answers` : delta < 0 ? "Slightly lower after this session" : "Holding steady";

  return (
    <div className={styles.shift} role="group" aria-label="Estimated readiness before and after this session">
      <div className={styles.numbers}>
        <span className={styles.from}>{from}%</span>
        <span className={styles.arrow} aria-hidden="true">→</span>
        <strong className={styles.to}>{to}%</strong>
        <span className={styles.label}>Estimated ready</span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <span className={styles.ghost} style={{ width: `${from}%` }} />
        <motion.span
          className={styles.fill}
          initial={reduce ? false : { width: `${from}%` }}
          animate={{ width: `${to}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.9, delay: 0.5 }}
        />
        <i className={styles.target} style={{ left: `${target}%` }} />
      </div>
      <p className={styles.note}>{note} · target {target}%</p>
    </div>
  );
}
