"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { PackArt } from "@/components/PackArt";
import { returnVisit, warmupChecks, type ReturnVisit } from "@/domain/return-visit";
import type { Concept, LearningEvent } from "@/domain/types";
import { getMissedLines, getServerMissedLines, keepMissedLinesFor, subscribeMissedLines } from "@/lib/missed-lines";
import styles from "./WelcomeBack.module.css";

const ease = [0.22, 1, 0.36, 1] as const;
const OUTCOME: Record<string, string> = { success: "solid pass", partial: "partly there", failure: "needs another attempt" };

function greeting(nowIso: string) {
  const hour = new Date(nowIso).getHours();
  return hour < 5 ? "Late night study." : hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
}

function away(days: number) {
  if (days <= 0) return "Back again today.";
  if (days === 1) return "Last time was yesterday.";
  return `It’s been ${days} days.`;
}

/**
 * The second visit starts here: a greeting, where you left off, and the lines you missed last time as a
 * one-minute warm-up before the next topic. Shown only to someone who has answered before, on a later visit.
 */
export function useReturnVisit(events: LearningEvent[], concepts: Concept[]) {
  const { state } = useLearner();
  const missed = useSyncExternalStore(subscribeMissedLines, getMissedLines, getServerMissedLines);
  const names = useMemo(() => new Map(concepts.map((concept) => [concept.id, concept.name])), [concepts]);
  // Lines of topics that were removed, or of another course, should never come back.
  useEffect(() => { keepMissedLinesFor(new Set(names.keys())); }, [names]);
  return { visit: returnVisit({ events, names, missed, nowMs: Date.parse(state.nowIso) }), nowIso: state.nowIso };
}

export function WelcomeBack({ visit, nowIso, nextName }: { visit: ReturnVisit; nowIso: string; nextName?: string }) {
  const reduce = useReducedMotion() === true;
  if (!visit.returning) return null;
  // The preview shows each line with its gap, as the warm-up will ask it: a teaser, never the answer.
  const teasers = warmupChecks(visit.warmup).map(({ line, item }) => ({ line, text: item.kind === "cloze" ? (item.prompt.match(/“(.+)”$/)?.[1] ?? null) : null }));
  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease } });
  const warm = visit.warmup.length > 0;

  return (
    <motion.section
      className={styles.card}
      aria-labelledby="welcome-title"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.55 }}
    >
      <motion.span className={styles.art} {...rise(0.12)}>
        <PackArt name={visit.daysAway >= 1 ? "time-flies" : "on-the-laptop"} size={150} />
      </motion.span>
      <div className={styles.body}>
        <p className={styles.kicker}>{greeting(nowIso)}</p>
        <h2 id="welcome-title" className={styles.title}>Welcome back.</h2>
        <p className={styles.line}>
          {away(visit.daysAway)}
          {visit.lastName ? <> Last time: <b>{visit.lastName}</b>{visit.lastOutcome ? `, ${OUTCOME[visit.lastOutcome]}` : ""}.</> : null}
        </p>

        {warm ? (
          <>
            <p className={styles.sub}>{visit.warmup.length === 1 ? "One line you missed" : `${visit.warmup.length} lines you missed`} last time, ready to try again:</p>
            <ul className={styles.notes} aria-label="Lines to warm up on">
              {teasers.map(({ line, text }, index) => (
                <motion.li key={line.quote} {...rise(0.22 + index * 0.07)}>
                  <b>{line.name}</b>
                  <span>{text ? text.split("_____").map((part, at, parts) => <Fragment key={at}>{part}{at < parts.length - 1 ? <><i className={styles.gap} aria-hidden="true" /><span className="sr-only">blank</span></> : null}</Fragment>) : "One line to choose the right word for"}</span>
                </motion.li>
              ))}
            </ul>
            <motion.div className={styles.actions} {...rise(0.3 + visit.warmup.length * 0.07)}>
              <Link href={`/session/warmup${nextName ? `?next=${encodeURIComponent(nextName)}` : ""}`} className={`k-btn k-btn--marigold ${styles.primary}`} data-action="start-warmup">
                Start the 1-minute warm-up <span aria-hidden="true">→</span>
              </Link>
              {nextName ? <span className={styles.or}>or go straight to {nextName} below</span> : null}
            </motion.div>
          </>
        ) : (
          <p className={styles.sub}>{nextName ? `Nothing left over from last time. Pick up with ${nextName}.` : "Nothing left over from last time."}</p>
        )}
      </div>
    </motion.section>
  );
}
