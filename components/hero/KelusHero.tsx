"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { NotionRevisionBoard } from "./NotionRevisionBoard";
import { kelusDuration, kelusEase, kelusMotion } from "@/components/motion";

const ease = kelusEase;
const press = kelusMotion.press;
const dur = kelusDuration;

const MARKS = [
  { border: "#097fe8", fill: "#e6f3fe", face: "#097fe8" },
  { border: "#f64932", fill: "#ffe8e4", face: "#f64932" },
  { border: "#ffb110", fill: "#fff4d6", face: "#e89d01" },
  { border: "#62aef0", fill: "#e8f4fc", face: "#097fe8" },
  { border: "#02093a", fill: "#eceef8", face: "#02093a" },
] as const;

/**
 * Notion paper hero: character marks → pill headline → editorial lede → CTAs → product mock.
 */
export function KelusHero() {
  const reduce = useReducedMotion() === true;

  return (
    <section className="kelus-hero home-hero is-folio is-notion" aria-labelledby="home-hero-title">
      <div className="folio-hero-atmosphere" aria-hidden="true">
        <span className="folio-hero-mist" />
        <span className="folio-hero-wash" />
        <span className="folio-hero-rule" />
      </div>

      <div className="folio-hero-copy home-copy">
        <motion.ul
          className="hero-marks"
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : dur.moderate, ease }}
        >
          {MARKS.map((mark, i) => (
            <motion.li
              key={mark.border}
              style={{ borderColor: mark.border, background: mark.fill }}
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: reduce ? 0 : dur.moderate,
                ease,
                delay: reduce ? 0 : dur.instant * i,
              }}
            >
              <span style={{ background: mark.face }} />
            </motion.li>
          ))}
        </motion.ul>

        <motion.h1
          id="home-hero-title"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : dur.slow, delay: reduce ? 0 : dur.instant, ease }}
        >
          Revise your lessons.{" "}
          <span className="hero-pill">Prepare</span> for your exams.
        </motion.h1>
        <motion.p
          className="home-lede"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : dur.moderate, delay: reduce ? 0 : dur.micro, ease }}
        >
          Bring your course notes. Practise recalling and applying what you’ve studied, check your answers,
          and revisit the topics that need more work before your exam.
        </motion.p>
        <motion.div
          className="home-actions"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : dur.moderate, delay: reduce ? 0 : dur.fast, ease }}
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
