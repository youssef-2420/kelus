"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { NotionRevisionBoard } from "./NotionRevisionBoard";
import { kelusDuration, kelusEase, kelusMotion } from "@/components/motion";

const ease = kelusEase;
const press = kelusMotion.press;
const dur = kelusDuration;

/**
 * Editorial desk hero: Kelus brand lockup, Source Serif display,
 * full-bleed notebook sheet — not a SaaS browser mock.
 */
export function KelusHero() {
  const reduce = useReducedMotion() === true;

  return (
    <section className="kelus-hero home-hero is-folio is-notion paper-loop-hero is-desk" aria-labelledby="home-hero-title">
      <div className="desk-atmosphere" aria-hidden="true">
        <span className="desk-grain" />
        <span className="desk-lamp" />
        <span className="desk-spine" />
      </div>

      <div className="folio-hero-copy home-copy">
        <motion.p
          className="hero-brand"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : dur.fast, ease }}
        >
          Kelus
        </motion.p>

        <motion.h1
          id="home-hero-title"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : dur.moderate, delay: reduce ? 0 : dur.micro, ease }}
        >
          Revise your lessons.
          <span className="hero-line-break">Prepare for the exam you actually have.</span>
        </motion.h1>

        <motion.p
          className="home-lede"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : dur.moderate, delay: reduce ? 0 : dur.fast, ease }}
        >
          Bring your course notes. Practise recalling what you studied, check your answers, and revisit
          weak topics before the exam.
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
              Revise my course
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <div className="folio-hero-visual folio-hero-notion">
        <NotionRevisionBoard />
      </div>
    </section>
  );
}
