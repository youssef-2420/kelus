"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ExamRoutePoster } from "./ExamRoutePoster";
import { kelusDuration, kelusEase, kelusMotion } from "@/components/motion";

const ease = kelusEase;
const press = kelusMotion.press;
const dur = kelusDuration;

/**
 * Marked-script hero: one headline, one lede, one primary path.
 * Brand lives in the site header — not repeated as a hero logo.
 * Interactive sample lives below the fold.
 */
export function KelusHero() {
  const reduce = useReducedMotion() === true;

  return (
    <section className="kelus-hero home-hero is-folio is-notion is-poster" aria-labelledby="home-hero-title">
      <div className="poster-copy home-copy">
        <motion.h1
          id="home-hero-title"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : dur.moderate, ease }}
        >
          <span className="hero-brand-sr">Kelus. </span>
          Revise your lessons.
          <span className="hero-line-break">Walk into the exam ready.</span>
        </motion.h1>

        <motion.p
          className="home-lede"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : dur.moderate, delay: reduce ? 0 : dur.fast, ease }}
        >
          Recall from your notes. Check the answer. See what to study next.
        </motion.p>

        <motion.div
          className="home-actions"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : dur.moderate, delay: reduce ? 0 : dur.normal, ease }}
        >
          <motion.div whileTap={reduce ? undefined : { scale: 0.97 }} transition={press}>
            <Link href="/today?sample=1" className="cta home-cta">
              Try sample (~1 min) <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </motion.div>
          <motion.div whileTap={reduce ? undefined : { scale: 0.98 }} transition={press}>
            <Link href="/today" className="home-secondary">
              Set my exam
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <div className="poster-visual">
        <ExamRoutePoster />
      </div>
    </section>
  );
}
