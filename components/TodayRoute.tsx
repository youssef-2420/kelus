"use client";

import { topicLevel } from "@/lib/format";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan, StudySession } from "@/domain/types";
import { HabitStrip } from "@/components/HabitStrip";
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
  const firstSource = firstActivity?.sourceReferences[0];
  const firstName = firstConcept?.name ?? "A mix of earlier topics";
  const whisper = citeWhisper(firstSource);
  const decision = describeRouteChoice(first, firstConcept, { examDateKnown: !examDatePending });
  const nextStops = route.allocations.filter((allocation) => allocation.conceptId !== first.conceptId).slice(0, 3).map((allocation) => {
    const concept = concepts.find((item) => item.id === allocation.conceptId);
    return { ...allocation, name: concept?.name ?? "A mix of earlier topics", mastery: concept?.mastery ?? 0, tried: (concept?.retrievalAttempts ?? 0) > 0 };
  });
  const lastPractice = isSampleCourse ? null : [...events]
    .filter((event) => event.kind === "retrieval" && concepts.some((item) => item.id === event.conceptId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const lastTopic = concepts.find((item) => item.id === lastPractice?.conceptId)?.name;
  // The same words the result card used, so one outcome never has three names.
  const lastResult = lastPractice?.outcome === "failure" ? "Needs another attempt" : lastPractice?.outcome === "partial" ? "Partly there" : lastPractice?.outcome === "success" ? "Solid pass" : "Answer saved";
  const installable = install === "prompt" || install === "ios";
  const path = studyPath({ concepts, nowMs: Date.parse(nowIso), daysToExam: examDatePending ? null : daysToExam });
  const level = (mastery: number, tried: boolean) => (tried ? topicLevel(mastery, 1) : "New");

  return (
    <div className={styles.page}>
      {!isSampleCourse ? <WelcomeBack visit={visit} nowIso={nowIso} nextName={firstName} /> : null}
      {/* Where the course stands, in steps rather than a percentage: started, solid, and the days still ahead. */}
      <div className={styles.top} role="group" aria-label="Your path through the course">
        <p className={styles.path}>
          <strong>{path.started} of {path.total}</strong> topics started{path.solid ? <> · <strong>{path.solid}</strong> solid</> : null}
        </p>
        <div className={styles.dots} aria-hidden="true">
          {concepts.slice(0, 24).map((concept) => <i key={concept.id} className={concept.retrievalAttempts > 0 ? (concept.mastery >= 0.67 ? styles.dotSolid : styles.dotStarted) : undefined} />)}
        </div>
        <p className={styles.ahead}>
          {path.daysLeft === 0
            ? "Everything is solid. Keep a short review going."
            : examDatePending || path.readyByMs === null
              ? `About ${path.daysLeft} study day${path.daysLeft === 1 ? "" : "s"} to cover it all.`
              : path.aheadOfExam !== null && path.aheadOfExam >= 0
                ? `At this pace you’re ready by ${new Date(path.readyByMs).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}, ${path.aheadOfExam === 0 ? "just in time" : `${path.aheadOfExam} day${path.aheadOfExam === 1 ? "" : "s"} before your exam`}.`
                : `About ${path.daysLeft} study days left and ${daysToExam} until your exam: a little more each day gets you there.`}
        </p>
      </div>

      <motion.article
        className={styles.card}
        data-block="today-lead"
        aria-labelledby="today-title"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5 }}
      >
        <p className={styles.kicker} data-block="today-page-folio">{goalDone ? `Today’s goal is done · one more if you like, about ${first.minutes} minutes` : `Up next · about ${first.minutes} minutes`}</p>
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
            className={`k-btn ${styles.start}${warmupFirst || goalDone ? ` k-btn--paper ${styles.quiet}` : ""}`}
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

      {/* One extra at a time, most useful first: the exam date gives the path its finish line, then the nudge that
          brings you back, then the home-screen app, then the calendar reminder. */}
      {isSampleCourse ? null
        : examDatePending && onSetExamDate ? <ExamDateCard onSave={onSetExamDate} />
        : hasPriorEvidence && (nudgesOffAtOpen || !nudges.on) && nudgesSupported() ? <NudgeCard />
        : hasPriorEvidence && installable ? <InstallCard />
        : reminder ? <ReminderCard {...reminder} nextStopName={firstName} />
        : null}
    </div>
  );
}
