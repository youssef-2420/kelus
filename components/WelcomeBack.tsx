"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { returnVisit, warmupChecks, type ReturnVisit } from "@/domain/return-visit";
import type { Concept, LearningEvent } from "@/domain/types";
import { getMissedLines, getServerMissedLines, keepMissedLinesFor, subscribeMissedLines } from "@/lib/missed-lines";
import styles from "./WelcomeBack.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

function greeting(nowIso: string) {
  const hour = new Date(nowIso).getHours();
  return hour < 5 ? "Late night study." : hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
}

function list(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length > 3) return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Where you left off, in one sentence: when, and what you practised then. */
function leftOff(days: number, names: string[]) {
  const when = days <= 0 ? "Earlier today" : days === 1 ? "Yesterday" : `${days} days ago`;
  return names.length ? `${when} you practised ${list(names)}.` : `${when} you practised here.`;
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
  // Any kind of check quotes its line in “…”; only the quoted part is shown, never the answer.
  const teasers = warmupChecks(visit.warmup).map(({ line, item }) => ({ line, text: item.prompt.match(/“(.+)”/)?.[1] ?? null }));
  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, delay: delay * 0.5, ease } });
  const warm = visit.warmup.length > 0;

  return (
    <motion.section
      className={styles.card}
      aria-labelledby="welcome-title"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.22, ease }}
    >
      <div className={styles.body}>
        <h2 id="welcome-title" className={styles.title}>{greeting(nowIso)}</h2>
        <p className={styles.line}>{leftOff(visit.daysAway, visit.lastDayNames)}</p>

        {warm ? (
          <>
            <p className={styles.sub}>{visit.warmup.length === 1 ? "One line you missed" : `${visit.warmup.length} lines you missed`} last time, ready to try again:</p>
            <ul className={styles.notes} aria-label="Lines to warm up on">
              {teasers.map(({ line, text }, index) => (
                <motion.li key={line.quote} {...rise(0.22 + index * 0.07)}>
                  <b>{line.name}</b>
                  <span>{text ? text.split("_____").map((part, at, parts) => <Fragment key={at}>{part}{at < parts.length - 1 ? <><i className={styles.gap} aria-hidden="true" /><span className="sr-only">blank</span></> : null}</Fragment>) : "One quick question on this line."}</span>
                </motion.li>
              ))}
            </ul>
            <motion.div className={styles.actions} {...rise(0.3 + visit.warmup.length * 0.07)}>
              <Link href={`/session/warmup${nextName ? `?next=${encodeURIComponent(nextName)}` : ""}`} className={`k-btn k-btn--marigold ${styles.primary}`} data-action="start-warmup">
                Warm up · 1 min <span aria-hidden="true">→</span>
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
