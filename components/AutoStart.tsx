"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PackArt } from "@/components/PackArt";
import { KelusLogoMark } from "@/components/KelusLogoMark";
import styles from "./AutoStart.module.css";

const FLAG = "kelus-start-first-run";

function flagged() {
  try { return window.sessionStorage.getItem(FLAG) === "1"; } catch { return false; }
}

function clearFlag() {
  try { window.sessionStorage.removeItem(FLAG); } catch { /* Harmless. */ }
}

export type BuiltPlan = { course: string; topics: number; questions: number; minutes: number; firstName: string };

/**
 * Right after new notes are read: what Kelus made from them, in numbers, before the first question. It is the moment
 * the learner sees the work done for them; one tap starts the first topic, or they can look at the plan first.
 */
export function AutoStart({ ready, plan, showPlan, onStart }: { ready: boolean; plan: BuiltPlan; /** First notes, nothing answered yet: show what was built. Otherwise (a warm-up's Continue) go straight on. */ showPlan: boolean; onStart: () => void }) {
  const reduce = useReducedMotion() === true;
  // Mounted only after the notes are read (never in the server HTML), so reading storage here is safe.
  const [open, setOpen] = useState(() => typeof window !== "undefined" && flagged());
  const fired = useRef(false);
  useEffect(() => {
    if (!open || showPlan || !ready || fired.current) return;
    fired.current = true;
    clearFlag();
    onStart();
    // Once, when Today is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showPlan, ready]);
  if (!open || !ready) return null;
  // Going straight on: a plain cover for the instant before the question opens, so Today never flashes.
  if (!showPlan) return createPortal(<div className={styles.cover} />, document.body);

  // Time from what there is to do: about 40 seconds a question and a minute and a half to explain each topic.
  const minutes = Math.max(2, Math.ceil(plan.questions * 0.7 + plan.topics * 1.5));
  const rows = [
    { big: String(plan.topics), label: plan.topics === 1 ? "topic found in your notes" : "topics found in your notes" },
    { big: String(plan.questions), label: plan.questions === 1 ? "question written from your own lines" : "questions written from your own lines" },
    { big: `${minutes < 10 ? minutes : Math.round(minutes / 5) * 5} min`, label: "to go through all of it once" },
  ];
  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, delay, ease: [0.22, 1, 0.36, 1] as const } });

  function start() { clearFlag(); onStart(); }
  function later() { clearFlag(); setOpen(false); }

  return createPortal(
    <div className={styles.cover}>
      {/* The same bar as every other screen, so this moment is still clearly Kelus, not a blank sheet. */}
      <header className={styles.bar}>
        <span className="study-brand"><KelusLogoMark /><span>kelus</span></span>
        <button type="button" className={styles.barLater} onClick={later}>Not now</button>
      </header>
      <section className={styles.card} aria-labelledby="built-title">
        <motion.span {...rise(0)} className={styles.art}><PackArt name="growing" size={140} /></motion.span>
        <motion.h1 {...rise(0.03)} id="built-title">{plan.course} is ready to study.</motion.h1>
        <motion.p {...rise(0.06)} className={styles.summary}>
          Kelus found <b>{rows[0].big} {plan.topics === 1 ? "topic" : "topics"}</b> in your notes and wrote <b>{rows[1].big} {plan.questions === 1 ? "question" : "questions"}</b> from your own lines. Going through all of it once takes about <b>{rows[2].big}</b>.
        </motion.p>
        <motion.p {...rise(0.09)} className={styles.how}>Each question comes from a line in your notes. What you miss comes back tomorrow, until you know it.</motion.p>
        <motion.div {...rise(0.12)} className={styles.actions}>
          <button type="button" className="k-btn" onClick={start}>Start with {plan.firstName} <span aria-hidden="true">→</span></button>
          <button type="button" className={styles.later} onClick={later}>See the plan first</button>
        </motion.div>
      </section>
    </div>,
    document.body,
  );
}
