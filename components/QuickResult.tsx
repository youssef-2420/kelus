"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { MarkStamp } from "@/components/MarkStamp";
import { PackArt } from "@/components/PackArt";
import type { RetrievalOutcome } from "@/domain/types";
import type { SelfGrade } from "@/domain/quick-run";
import styles from "./QuickResult.module.css";

export type QuickStats = { right: number; total: number; unsure: number; self: SelfGrade };

const VERDICT: Record<RetrievalOutcome, { title: string; line: string }> = {
  success: { title: "Solid pass.", line: "You knew it and you could say it." },
  partial: { title: "Partly there.", line: "Some of it is solid. One more look will fix the rest." },
  failure: { title: "Needs another attempt.", line: "That is what practice is for. Now you know what to read again." },
};

const SELF_LABEL: Record<SelfGrade, string> = { nailed: "Nailed it", partly: "Partly", missed: "Missed it" };
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The reward moment after a topic: how the checks went as filling dots, how you rated yourself, the one thing to
 * remember (quoted from your notes), today's goal filling up, and a single next step. Detail is one tap away.
 */
export function QuickResult({
  outcome, topic, attempts, stats, remember, rememberLabel = "Worth remembering", locator, goalDone, goal, routeLine, nextName, details, onRetry, onContinue, onSource,
}: {
  outcome: RetrievalOutcome;
  topic: string;
  /** How many times this topic has been answered, counting this one. */
  attempts: number;
  stats: QuickStats | null;
  remember: string;
  /** What the quote is: a line to look at again, a new line, or the main idea. */
  rememberLabel?: string;
  locator: string;
  goalDone: number;
  goal: number;
  routeLine: string;
  nextName?: string;
  details: ReactNode;
  onRetry: () => void;
  onContinue: () => void;
  onSource?: () => void;
}) {
  const reduce = useReducedMotion() === true;
  const verdict = VERDICT[outcome];
  const pop = (index: number) => (reduce ? {} : { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.32, delay: 0.5 + index * 0.12, ease } });
  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay, ease } });
  const goalMet = goalDone >= goal;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.stamp}><MarkStamp outcome={outcome} /></span>
        <motion.h1 {...rise(0.1)} className={styles.title}>{verdict.title}</motion.h1>
      </div>
      <motion.p {...rise(0.16)} className={styles.line}>{topic} · {attempts === 1 ? "first check" : `${attempts} checks`}. {verdict.line}</motion.p>

      {stats ? (
        <motion.div {...rise(0.3)} className={styles.facts}>
          <div className={styles.fact}>
            <span className={styles.label}>Quick checks</span>
            <span className={styles.pips} role="img" aria-label={`${stats.right} of ${stats.total} checks right${stats.unsure ? `, ${stats.unsure} marked not sure` : ""}`}>
              {Array.from({ length: stats.total }, (_, index) => (
                <motion.i key={index} className={index < stats.right ? styles.on : undefined} {...pop(index)} />
              ))}
            </span>
            <strong>{stats.right} of {stats.total}{stats.unsure ? <small> · {stats.unsure} not sure</small> : null}</strong>
          </div>
          <div className={styles.fact}>
            <span className={styles.label}>You said</span>
            <strong>{SELF_LABEL[stats.self]}</strong>
          </div>
        </motion.div>
      ) : null}

      <motion.blockquote {...rise(0.42)} className={styles.remember}>
        <span className={styles.rememberHead}><PackArt name="clipboard-check" className={styles.icon} />{rememberLabel}{/^Section\b/.test(locator) ? "" : ` · ${locator}`}</span>
        <p>“{remember}”</p>
      </motion.blockquote>

      <motion.div {...rise(0.54)} className={styles.goal} aria-label={`Today: ${goalDone} of ${goal} topics`}>
        <span className={styles.goalDots} aria-hidden="true">
          {Array.from({ length: goal }, (_, index) => <i key={index} className={index < goalDone ? styles.on : undefined} />)}
        </span>
        <span>{goalMet ? <><PackArt name="award" className={styles.icon} /> Today’s goal reached.</> : `${goalDone} of ${goal} topics today.`}</span>
      </motion.div>

      <p className={styles.route} role="status">{routeLine}</p>

      <div className={styles.actions}>
        {outcome !== "success" ? <button type="button" className={styles.secondary} onClick={onRetry}>Try again <span aria-hidden="true">↻</span></button> : null}
        <button type="button" className={styles.primary} onClick={onContinue}>{nextName ? `Continue to ${nextName}` : "Finish block"} <span aria-hidden="true">→</span></button>
      </div>

      <details className={styles.more}>
        <summary>How your plan changed</summary>
        <div className={styles.moreBody}>{details}</div>
        {onSource ? <button type="button" className={styles.link} onClick={onSource}>Review the source behind this topic <span aria-hidden="true">↗</span></button> : null}
      </details>
    </div>
  );
}
