"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ExamRoutePoster } from "./ExamRoutePoster";
import styles from "./MarkedScriptHero.module.css";

const press = { type: "spring", bounce: 0, duration: 0.24 } as const;

/**
 * Marked-script hero: one headline, one lede, one primary path.
 * Brand lives in the site header — not repeated in the hero.
 * Interactive sample lives below the fold.
 */
export function KelusHero() {
  const reduce = useReducedMotion() === true;

  return (
    <section className={`${styles.hero} is-poster`} aria-labelledby="home-hero-title" data-hero="marked-script">
      <div className={styles.copy}>
        <h1
          id="home-hero-title"
          className={styles.headline}
        >
          Revise your lessons.{" "}
          <span className={styles.secondLine}>Walk into the exam ready.</span>
        </h1>

        <p
          className={styles.lede}
        >
          Recall from your notes. Check the answer. Your answer changes what you study next.
        </p>

        <div
          className={styles.actions}
        >
          <motion.div tabIndex={-1} whileTap={reduce ? undefined : { scale: 0.97 }} transition={press}>
            <Link href="/today" className={styles.primary}>
              Set my exam <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </motion.div>
          <motion.div tabIndex={-1} whileTap={reduce ? undefined : { scale: 0.98 }} transition={press}>
            <Link href="/today?sample=1" className={styles.secondary}>
              Try sample (~1 min)
            </Link>
          </motion.div>
        </div>
        <p className={styles.actionHint}>Set up with your own material, or try a prepared example.</p>
      </div>

      <div className={styles.visual}>
        <ExamRoutePoster />
      </div>
      <p className={styles.mobileCaption}>In this example, Elasticity needs another attempt — so it comes first.</p>
    </section>
  );
}
