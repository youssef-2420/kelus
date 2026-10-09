"use client";

import { topicLevel } from "@/lib/format";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan, StudySession } from "@/domain/types";
import { habitSummary, studyPath } from "@/domain/habit";
import { NudgeCard } from "@/components/NudgeCard";
import { InstallCard } from "@/components/InstallCard";
import { getNudgeSettings, getServerNudgeSettings, nudgesSupported, subscribeNudgeSettings } from "@/lib/nudge";
import { installState, serverInstallState, subscribeInstall } from "@/lib/install-app";
import { useReturnVisit, WelcomeBack } from "@/components/WelcomeBack";
import { ReminderCard } from "@/components/ReminderCard";
import { ExamDateCard } from "@/components/ExamDateCard";
import { estimatedReadiness } from "@/domain/readiness";
import { describeRouteChoice } from "@/lib/today-reason";
import { trackEvent } from "@/lib/analytics";
import { HabitStrip } from "@/components/HabitStrip";
import styles from "./TodayRoute.module.css";

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
  focus,
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
  onSetExamDate?: (date: string, targetPercent?: number) => void;
  focus?: RoutePlan["allocations"][number];
}) {
  const reduceMotion = useReducedMotion();
  // The topic this card is about: the open block's current topic when there is one, else the route's first.
  const first = focus ?? route.allocations[0];
  const { visit, nowIso } = useReturnVisit(events, concepts);
  const nudges = useSyncExternalStore(subscribeNudgeSettings, getNudgeSettings, getServerNudgeSettings);
  const install = useSyncExternalStore(subscribeInstall, installState, serverInstallState);
  // Nudges off when Today opened: the card stays for this visit, so turning them on is confirmed where you tapped.
  const [nudgesOffAtOpen] = useState(() => typeof window !== "undefined" && !getNudgeSettings().on);
  // When the visit opens with a warm-up, that is the one green button; the topic waits one step quieter.
  const warmupFirst = !isSampleCourse && visit.returning && visit.warmup.length > 0;
  // With today's goal done, the next topic is offered as an extra, not pressed on.
  const goalDone = !isSampleCourse && habitSummary({ events, concepts }).goalMet;
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
  const firstName = firstConcept?.name ?? "A mix of earlier topics";
  const decision = describeRouteChoice(first, firstConcept, { examDateKnown: !examDatePending });
  const nextStops = route.allocations.filter((allocation) => allocation.conceptId !== first.conceptId).slice(0, 3).map((allocation) => {
    const concept = concepts.find((item) => item.id === allocation.conceptId);
    return { ...allocation, name: concept?.name ?? "A mix of earlier topics", mastery: concept?.mastery ?? 0, tried: (concept?.retrievalAttempts ?? 0) > 0 };
  });
  const installable = install === "prompt" || install === "ios";
  const path = studyPath({ concepts, nowMs: Date.parse(nowIso), daysToExam: examDatePending ? null : daysToExam });
  const level = (mastery: number, tried: boolean) => (tried ? topicLevel(mastery, 1) : "New");

  return (
    <div className={styles.page}>
      {!isSampleCourse ? <WelcomeBack visit={visit} nowIso={nowIso} nextName={firstName} /> : null}
      {/* Where the course stands, in steps rather than a percentage: started, solid, and the days still ahead. */}
      {/* On a warm-up day the warm-up is the first thing to do; the path line and extras wait for a plain day. */}
      {warmupFirst ? null : <div className={styles.top} role="group" aria-label="Your path through the course">
        <p className={styles.path}>
          <strong>{path.started} of {path.total}</strong> topics started{path.solid ? <> · <strong>{path.solid}</strong> solid</> : null}
          <span className={styles.ahead}>
            {" · "}
            {path.daysLeft === 0
              ? "everything is solid, keep a short review going."
              : examDatePending || path.readyByMs === null
                ? `about ${path.daysLeft} study day${path.daysLeft === 1 ? "" : "s"} to cover it all.`
                : path.aheadOfExam !== null && path.aheadOfExam >= 0
                  ? `ready by ${new Date(path.readyByMs).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} at this pace, ${path.aheadOfExam === 0 ? "just in time" : `${path.aheadOfExam} day${path.aheadOfExam === 1 ? "" : "s"} before your exam`}.`
                  : `about ${path.daysLeft} study days left and ${daysToExam} until your exam.`}
          </span>
        </p>
      </div>}

      <motion.article
        className={styles.card}
        data-block="today-lead"
        aria-labelledby="today-title"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.12 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* The topic is the heading; what it takes and why it is next follow it, never sit above it as a label. */}
        <h1 id="today-title" className={styles.title}>{firstName}</h1>
        <p className={styles.meta} data-block="today-page-folio">{goalDone ? "Today’s goal is done. One more if you like: " : ""}{first.minutes} min · 3 quick checks and 1 explanation</p>
        <p className={styles.why} data-block="today-decision" aria-label="Why this topic is first">{decision.join(" ")}</p>
        <div className={styles.actions}>
          <motion.button
            type="button"
            data-action="start-topic"
            className={`k-btn ${styles.start}${warmupFirst || goalDone ? ` k-btn--paper ${styles.quiet}` : ""}`}
            onClick={onStart}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            transition={pressSpring}
          >
            {startLabel ?? "Start this topic"} <span aria-hidden="true">→</span>
          </motion.button>
        </div>
      </motion.article>

      {/* The streak is what brings you back tomorrow; the full picture is one click away in Progress. */}
      <HabitStrip events={events} concepts={concepts} link={false} />

      {nextStops.length ? (
        <aside className={styles.then} data-block="today-next" aria-label="Planned next topics">
          <h2>Then</h2>
          <ol>
            <AnimatePresence initial={false} mode="popLayout">
            {nextStops.map((stop, index) => (
              <motion.li
                key={`${stop.conceptId}-${nextStops.slice(0, index).filter((other) => other.conceptId === stop.conceptId).length}`}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10, transition: { duration: 0.18 } }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1], layout: { type: "spring", stiffness: 420, damping: 38 } }}
              >
                <strong>{stop.name}</strong>
                <span className={styles.tag}>{stop.conceptId === "mixed-retrieval" ? "Review" : level(stop.mastery, stop.tried)}</span>
                <span className={styles.min}>{stop.minutes} min</span>
              </motion.li>
            ))}
            </AnimatePresence>
          </ol>
          <p>Your answer can change what comes next.</p>
        </aside>
      ) : null}

      {/* One extra at a time, most useful first: the exam date gives the path its finish line, then the nudge that
          brings you back, then the home-screen app, then the calendar reminder. */}
      {isSampleCourse || warmupFirst ? null
        : examDatePending && onSetExamDate ? <ExamDateCard onSave={onSetExamDate} />
        : hasPriorEvidence && (nudgesOffAtOpen || !nudges.on) && nudgesSupported() ? <NudgeCard />
        : hasPriorEvidence && installable ? <InstallCard />
        : reminder ? <ReminderCard {...reminder} nextStopName={firstName} />
        : null}
    </div>
  );
}
