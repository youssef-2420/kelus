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
import q from "./TodayQuiet.module.css";

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
  const habit = habitSummary({ events, concepts });
  const goalDone = !isSampleCourse && habit.goalMet;
  const goalDoneCount = habit.topicsToday;
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

  // Enter on Today starts (or continues) the next topic, as the button's ↵ says.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body && target.closest("input, textarea, select, button, a, [contenteditable], [role=dialog]")) return;
      event.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

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
  const path = studyPath({ concepts, nowMs: Date.parse(nowIso), daysToExam: examDatePending ? null : daysToExam, doneToday: goalDoneCount });
  const level = (mastery: number, tried: boolean) => (tried ? topicLevel(mastery, 1) : "New");

  const courseName = reminder?.courseName ?? examTarget;
  const pathLine = path.daysLeft === 0
    ? "everything is solid, keep a short review going"
    : examDatePending || path.readyByMs === null
      ? `about ${path.daysLeft} study day${path.daysLeft === 1 ? "" : "s"} to cover it all`
      : path.aheadOfExam !== null && path.aheadOfExam >= 0
        ? `ready by ${new Date(path.readyByMs).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} at this pace, ${path.aheadOfExam === 0 ? "just in time" : `${path.aheadOfExam} day${path.aheadOfExam === 1 ? "" : "s"} before your exam`}`
        : `about ${path.daysLeft} study days left and ${daysToExam} until your exam`;
  const ease = [0.22, 1, 0.36, 1] as const;
  // One soft settle for the whole page, in order, all done by about a quarter of a second.
  const settle = (index: number) => (reduceMotion ? {} : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, delay: index * 0.03, ease } });
  const quietStart = warmupFirst || goalDone;

  return (
    <div className={q.page}>
      {!isSampleCourse ? <WelcomeBack visit={visit} nowIso={nowIso} nextName={firstName} /> : null}

      {/* The page is titled like a document: the course, then one grey line on where it stands. */}
      <motion.header className={q.head} {...settle(0)}>
        <h1 className={q.title}>{courseName}</h1>
        {warmupFirst ? null : (
          <p className={q.meta} role="group" aria-label="Your path through the course">
            <strong>{path.started} of {path.total}</strong> topics started{path.solid ? <> · <strong>{path.solid}</strong> solid</> : null} · {pathLine}
          </p>
        )}
      </motion.header>

      <motion.section className={q.next} data-block="today-lead" aria-labelledby="today-title" {...settle(1)}>
        <p className={q.label}>{startLabel ? "Continue" : goalDone ? "One more, if you like" : "Up next"}</p>
        <h2 id="today-title" className={q.topic}>{firstName}</h2>
        <p className={q.sub} data-block="today-page-folio">{first.minutes} min · 3 quick checks and 1 explanation</p>
        <p className={q.why} data-block="today-decision" aria-label="Why this topic is first">{decision.join(" ")}</p>
        <motion.button
          type="button"
          data-action="start-topic"
          className={quietStart ? q.secondary : q.primary}
          onClick={onStart}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          transition={pressSpring}
        >
          {startLabel ?? "Start this topic"}
          {quietStart ? null : <kbd className={q.key} aria-hidden="true">↵</kbd>}
        </motion.button>
      </motion.section>

      <motion.div {...settle(2)}><HabitStrip events={events} concepts={concepts} link={false} line /></motion.div>

      {nextStops.length ? (
        <motion.section className={q.then} data-block="today-next" aria-label="Planned next topics" {...settle(3)}>
          <h2 className={q.label}>Then</h2>
          <ol>
            <AnimatePresence initial={false} mode="popLayout">
            {nextStops.map((stop, index) => (
              <motion.li
                key={`${stop.conceptId}-${nextStops.slice(0, index).filter((other) => other.conceptId === stop.conceptId).length}`}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8, transition: { duration: 0.16 } }}
                transition={{ duration: 0.18, ease, layout: { type: "spring", stiffness: 420, damping: 38 } }}
              >
                <strong>{stop.name}</strong>
                <span>{stop.conceptId === "mixed-retrieval" ? "Review" : level(stop.mastery, stop.tried)}</span>
                <em>{stop.minutes} min</em>
              </motion.li>
            ))}
            </AnimatePresence>
          </ol>
          <p className={q.foot}>Your answers can change what comes next.</p>
        </motion.section>
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
