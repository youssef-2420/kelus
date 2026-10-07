"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan, StudySession } from "@/domain/types";
import { HabitStrip } from "@/components/HabitStrip";
import { ReminderCard } from "@/components/ReminderCard";
import { ExamDateCard } from "@/components/ExamDateCard";
import { estimatedReadiness } from "@/domain/readiness";
import { describeRouteChoice } from "@/lib/today-reason";
import { trackEvent } from "@/lib/analytics";
import styles from "./TodayRoute.module.css";

function citeWhisper(source: { label: string; locator?: string | null } | undefined) {
  if (!source) return null;
  const locator = source.locator?.trim();
  // "Section 2" of pasted notes says nothing; a PDF page number does.
  if (!locator || /not your upload/i.test(locator) || /^Section\b/.test(locator)) return source.label;
  return `${source.label} · ${locator}`;
}

const pressSpring = { type: "spring", bounce: 0, duration: 0.28 } as const;

/**
 * Today is one page: the next topic is the title.
 * Presence comes from type, paper, and interruptible motion — not chrome.
 */
export function TodayRoute({
  route,
  concepts,
  activities,
  events,
  sessions,
  examTarget,
  targetPercent,
  daysToExam,
  onStart,
  startLabel,
  isSampleCourse = false,
  reminder,
  examDatePending = false,
  onSetExamDate,
}: {
  route: RoutePlan;
  concepts: Concept[];
  activities: LearningActivity[];
  events: LearningEvent[];
  sessions: StudySession[];
  examTarget: string;
  targetPercent: number;
  daysToExam: number;
  onStart: () => void;
  startLabel?: string;
  isSampleCourse?: boolean;
  reminder?: { courseName: string; examDate: string; minutes: number };
  examDatePending?: boolean;
  onSetExamDate?: (date: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [first] = route.allocations;
  const openedRef = useRef(false);
  const hasPriorEvidence = !isSampleCourse && events.some((event) => event.kind === "retrieval");

  useEffect(() => {
    if (isSampleCourse || openedRef.current) return;
    openedRef.current = true;
    trackEvent({
      name: "today_opened",
      returning: hasPriorEvidence,
      has_next_route: route.allocations.length > 1,
    });
  }, [hasPriorEvidence, isSampleCourse, route.allocations.length]);

  if (!first) {
    return (
      <div className="today-route-empty materials-empty">
        <h1>Nothing ready yet.</h1>
        <p>Add a page to the binder so Kelus can open the first block.</p>
        <div className="today-route-empty-actions">
          <Link className="cta" href="/today?section=materials">
            Open binder <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-btn" href="/today?section=map">
            Open index
          </Link>
        </div>
      </div>
    );
  }

  const firstConcept = concepts.find((item) => item.id === first.conceptId);
  const firstActivity = activities.find((item) => item.conceptId === first.conceptId);
  const firstSource = firstActivity?.sourceReferences[0];
  const firstName = firstConcept?.name ?? "Mixed Retrieval";
  const whisper = citeWhisper(firstSource);
  const decision = describeRouteChoice(first, firstConcept);
  const nextStops = route.allocations.slice(1, 4).map((allocation) => {
    const concept = concepts.find((item) => item.id === allocation.conceptId);
    return { ...allocation, name: concept?.name ?? "Mixed recall", mastery: concept?.mastery ?? 0, tried: (concept?.retrievalAttempts ?? 0) > 0 };
  });
  const lastPractice = isSampleCourse ? null : [...events]
    .filter((event) => event.kind === "retrieval" && concepts.some((item) => item.id === event.conceptId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const lastTopic = concepts.find((item) => item.id === lastPractice?.conceptId)?.name;
  // The same words the result card used, so one outcome never has three names.
  const lastResult = lastPractice?.outcome === "failure" ? "Needs another attempt" : lastPractice?.outcome === "partial" ? "Partly there" : lastPractice?.outcome === "success" ? "Solid pass" : "Answer saved";
  const ready = Math.round(Math.max(0, Math.min(1, estimatedReadiness(concepts))) * 100);
  const aim = Math.round(Math.max(0, Math.min(100, targetPercent)));
  const level = (mastery: number, tried: boolean) => (!tried ? "New" : mastery < 0.34 ? "Needs work" : mastery < 0.67 ? "Partly there" : "Solid");

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <p><strong>{examTarget}</strong> · {examDatePending ? "no date yet" : `${daysToExam} day${daysToExam === 1 ? "" : "s"} to go`}</p>
        <div className={styles.ready} role="group" aria-label="Exam readiness">
          <span>Ready {ready}%</span>
          <span className={styles.track} aria-hidden="true"><i style={{ width: `${ready}%` }} /></span>
          <span>Your target {aim}%</span>
        </div>
      </div>

      <motion.article
        className={styles.card}
        data-block="today-lead"
        aria-labelledby="today-title"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5 }}
      >
        <p className={styles.kicker} data-block="today-page-folio">Up next · about {first.minutes} minutes</p>
        <h1 id="today-title" className={styles.title}>{firstName}</h1>
        <p className={styles.why} data-block="today-decision" aria-label="Why this topic is first">{decision.join(" ")}</p>
        <ul className={styles.chips} aria-label="What this takes">
          <li>3 quick checks</li>
          <li>1 explanation</li>
        </ul>
        <div className={styles.actions}>
          <motion.button
            type="button"
            data-action="start-topic"
            className={styles.start}
            onClick={onStart}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            transition={pressSpring}
          >
            {startLabel ?? "Start this topic"} <span aria-hidden="true">→</span>
          </motion.button>
          {whisper ? <p className={styles.source}>From {whisper}</p> : null}
        </div>
        {lastPractice && lastTopic ? <p className={styles.source}>Last answer: {lastTopic} · {lastResult}.</p> : null}
      </motion.article>

      <HabitStrip events={events} concepts={concepts} />

      {nextStops.length ? (
        <aside className={styles.then} data-block="today-next" aria-label="Planned next topics">
          <h2>Then</h2>
          <ol>
            {nextStops.map((stop, index) => (
              <li key={`${stop.conceptId}-${index}`}>
                <strong>{stop.name}</strong>
                <span className={styles.tag}>{level(stop.mastery, stop.tried)}</span>
                <span className={styles.track} aria-hidden="true"><i style={{ width: `${Math.round(stop.mastery * 100)}%` }} /></span>
                <span className={styles.min}>{stop.minutes} min</span>
              </li>
            ))}
          </ol>
          <p>Your answer can change what comes next.</p>
        </aside>
      ) : null}

      {examDatePending && onSetExamDate && !isSampleCourse ? <ExamDateCard onSave={onSetExamDate} /> : null}
      {reminder && !isSampleCourse && !examDatePending ? <ReminderCard {...reminder} nextStopName={firstName} /> : null}
    </div>
  );
}
