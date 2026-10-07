"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { habitSummary } from "@/domain/habit";
import type { Concept, LearningEvent } from "@/domain/types";
import styles from "./HabitStrip.module.css";

function message(summary: ReturnType<typeof habitSummary>, studiedBefore: boolean) {
  if (summary.goalMet) {
    return summary.backTomorrow > 0
      ? `Done for today. ${summary.backTomorrow} topic${summary.backTomorrow === 1 ? "" : "s"} come${summary.backTomorrow === 1 ? "s" : ""} back tomorrow.`
      : "Done for today. Come back tomorrow to keep it going.";
  }
  if (summary.streak > 0 && !summary.studiedToday) return `Study one topic today to keep your ${summary.streak}-day streak.`;
  if (summary.topicsToday > 0) return `${summary.goal - summary.topicsToday} more to reach today’s goal.`;
  if (summary.streak === 0) return studiedBefore ? "Answer one topic today to start a new streak." : "Answer your first topic to start a streak.";
  return "";
}

/** The return loop on Today: today's goal, the last seven days, and the one thing that makes tomorrow worth opening. */
export function HabitStrip({ events, concepts, compact = false }: { events: LearningEvent[]; concepts: Concept[]; /** Goal and week only, where the page says what comes next itself. */ compact?: boolean }) {
  const reduce = useReducedMotion() === true;
  const summary = habitSummary({ events, concepts });
  const share = Math.min(1, summary.topicsToday / summary.goal);
  const text = message(summary, events.some((event) => event.kind === "retrieval"));

  return (
    <section className={styles.strip} aria-label="Your study habit">
      <div className={styles.goal}>
        <p className={styles.label}>Today</p>
        <p className={styles.count}><strong>{Math.min(summary.topicsToday, summary.goal)}</strong> of {summary.goal} topics</p>
        <div className={styles.track} role="progressbar" aria-label="Today’s goal" aria-valuemin={0} aria-valuemax={summary.goal} aria-valuenow={Math.min(summary.topicsToday, summary.goal)}>
          <motion.span className={`${styles.fill}${summary.goalMet ? ` ${styles.met}` : ""}`} initial={reduce ? false : { width: 0 }} animate={{ width: `${share * 100}%` }} transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      </div>

      <div className={styles.week}>
        <p className={styles.label}>{summary.streak > 0 ? `${summary.streak}-day streak` : "This week"}</p>
        <ol className={styles.days} aria-label="Last seven days">
          {summary.week.map((day) => (
            <li key={day.key} className={`${day.studied ? styles.studied : ""}${day.today ? ` ${styles.isToday}` : ""}`} aria-label={`${day.today ? "Today" : day.key}: ${day.studied ? "studied" : "not studied"}`}>
              <span aria-hidden="true">{day.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {compact ? null : text || summary.pointsThisWeek > 0 ? (
        <p className={styles.note} role="status">
          {text}
          {summary.pointsThisWeek > 0 ? <span> Estimated readiness is up {summary.pointsThisWeek} point{summary.pointsThisWeek === 1 ? "" : "s"} this week.</span> : null}
        </p>
      ) : null}
      {compact ? null : <Link href="/today?section=progress" className={styles.more}>See your progress <span aria-hidden="true">→</span></Link>}
    </section>
  );
}
