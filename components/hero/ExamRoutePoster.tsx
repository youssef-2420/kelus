"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import styles from "./MarkedScriptHero.module.css";

/** One legible revision moment, rather than an animated map of the whole course. */
export function ExamRoutePoster() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sheetRef, { once: true, amount: 0.3 });
  const reduceMotion = useReducedMotion();
  // The server and first client render must agree; reduced motion changes only timing.
  const settled = inView;

  return (
    <figure
      className={styles.script}
      role="img"
      aria-label="Illustrative Microeconomics study sheet: a note about substitutes becomes a recall question. After an answer needs another attempt, Elasticity moves to the top of today's route."
    >
      <motion.div
        ref={sheetRef}
        className={styles.sheet}
        aria-hidden="true"
        initial={false}
        animate={{ opacity: settled ? 1 : 0.92, y: settled ? 0 : 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.sheetTopline}>
          <span>Microeconomics</span>
          <span>Sample study sheet</span>
        </div>

        <div className={styles.note}>
          <span className={styles.noteLabel}>From the lesson</span>
          <p>Close substitutes make demand <span className={styles.highlight}>more responsive<motion.span
            className={styles.highlightStroke}
            data-cue="source"
            initial={false}
            animate={{ scaleX: settled ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
          /></span> to a price change.</p>
        </div>

        <div className={styles.recall}>
          <motion.span
            className={styles.recallRule}
            data-cue="recall"
            initial={false}
            animate={{ scaleY: settled ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className={styles.recallLabel}>Try to recall</span>
          <p>Why does having another option make demand more elastic?</p>
          <div className={styles.answerLines} aria-hidden="true"><span /><span /></div>
        </div>

        <div className={styles.nextStep}>
          <span className={styles.nextLabel}>After a shaky answer</span>
          <strong>Elasticity moves to the top of the route <motion.span
            className={styles.routeArrow}
            data-cue="route"
            initial={false}
            animate={{ opacity: settled ? 1 : 0, x: settled ? 0 : -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
          >↗</motion.span></strong>
        </div>
      </motion.div>
    </figure>
  );
}
