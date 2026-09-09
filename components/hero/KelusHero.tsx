"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { StudentIllustration } from "./StudentIllustration";
import { kelusEase, kelusMotion } from "@/components/motion";

const ease = kelusEase;
const press = kelusMotion.press;

/**
 * First viewport only: one composition — copy + dominant student plane.
 * Interactive demo lives in HeroProductDemo (below the fold).
 */
export function KelusHero() {
  const reduce = useReducedMotion() === true;

  return (
    <section className="kelus-hero home-hero is-folio" aria-labelledby="home-hero-title">
      <div className="folio-hero-atmosphere" aria-hidden="true">
        <span className="folio-hero-mist" />
        <span className="folio-hero-wash" />
        <span className="folio-hero-rule" />
      </div>

      <div className="folio-hero-copy home-copy">
        <motion.p
          className="kicker"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease }}
        >
          A little revision. Every day.
        </motion.p>
        <motion.h1
          id="home-hero-title"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.06, ease }}
        >
          Revise your lessons.
          <span> Prepare for your exams.</span>
        </motion.h1>
        <motion.p
          className="home-lede"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.12, ease }}
        >
          Bring your course notes. Practise recalling and applying what you’ve studied, check your answers,
          and revisit the topics that need more work before your exam.
        </motion.p>
        <motion.div
          className="home-actions"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.18, ease }}
        >
          <motion.div whileTap={reduce ? undefined : { scale: 0.97 }} transition={press}>
            <Link href="/today?sample=1" className="cta home-cta">
              Try sample (~1 min) <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </motion.div>
          <motion.div whileTap={reduce ? undefined : { scale: 0.98 }} transition={press}>
            <Link href="/today" className="home-secondary">
              Revise my course
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <div className="folio-hero-visual" aria-hidden="true">
        <StudentIllustration className="folio-hero-student" />
      </div>
    </section>
  );
}
