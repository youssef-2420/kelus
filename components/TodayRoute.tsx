"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan } from "@/domain/types";
import { kelusEase } from "@/components/motion";
import { describeRouteChoice, describeRoutePayoff } from "@/lib/today-reason";
import { trackEvent } from "@/lib/analytics";

function citeWhisper(source: { label: string; locator?: string | null } | undefined) {
  if (!source) return null;
  const locator = source.locator?.trim();
  if (!locator || /not your upload/i.test(locator)) return source.label;
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
  examTarget,
  targetPercent,
  daysToExam,
  onStart,
  startLabel,
  isSampleCourse = false,
}: {
  route: RoutePlan;
  concepts: Concept[];
  activities: LearningActivity[];
  events: LearningEvent[];
  examTarget: string;
  targetPercent: number;
  daysToExam: number;
  onStart: () => void;
  startLabel?: string;
  isSampleCourse?: boolean;
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
  const routeMinutes = route.allocations.reduce((total, allocation) => total + allocation.minutes, 0);
  const decision = describeRouteChoice(first, firstConcept);
  const lastPractice = isSampleCourse ? null : [...events]
    .filter((event) => event.kind === "retrieval" && concepts.some((item) => item.id === event.conceptId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const lastTopic = concepts.find((item) => item.id === lastPractice?.conceptId)?.name;
  const lastResult = lastPractice?.outcome === "failure" ? "Needs another attempt" : lastPractice?.outcome === "partial" ? "Getting there" : lastPractice?.outcome === "success" ? "Strong evidence" : "Evidence recorded";
  const nextStops = route.allocations.slice(1, 4).map((allocation) => ({
    ...allocation,
    name: concepts.find((concept) => concept.id === allocation.conceptId)?.name ?? "Mixed recall",
  }));
  const payoff = describeRoutePayoff(first, nextStops[0]?.name);
  return (
    <div className="today-route-execution is-one-next is-booklet-page is-presence">
      <motion.article
        className="today-lead-action is-page is-presence"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.12 }
            : { type: "spring", bounce: 0, duration: 0.5 }
        }
      >
        <motion.p
          className="today-page-folio"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.4, delay: reduceMotion ? 0 : 0.06, ease: kelusEase }}
        >
          <span>Today’s route · {routeMinutes} min total</span>
        </motion.p>
        <p className="today-exam-context">{examTarget} · {daysToExam} day{daysToExam === 1 ? "" : "s"} left · Your target {targetPercent}%</p>
        <motion.h1
          id="today-title"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : { type: "spring", bounce: 0, duration: 0.55, delay: 0.04 }
          }
        >
          {firstName}
        </motion.h1>
        <p className="today-first-duration">First block · {first.minutes} min</p>
        <div className="today-decision" aria-label="Why this topic is first">
          <p className="today-decision-label">Why now</p>
          {decision.map((line) => <p key={line}>{line}</p>)}
          <p className="today-decision-payoff"><strong>What this unlocks</strong>{payoff}</p>
        </div>
        {whisper ? <p className="today-source-reference">Source · {whisper}</p> : null}
        {lastPractice && lastTopic ? <p className="today-return-note">Last answer · {lastTopic} · {lastResult}. Your route includes that evidence.</p> : null}
        <motion.button
          type="button"
          className="cta today-start"
          onClick={onStart}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          transition={pressSpring}
        >
          {startLabel ?? "Start this topic"} <span aria-hidden="true">→</span>
        </motion.button>
        <p className="today-session-preview">
          {lastPractice ? "Continue from your last answer — read, recall, use, then check your thinking." : "Read the source, recall the idea, use it, then check your answer."}
        </p>
      </motion.article>
      {nextStops.length ? (
        <aside className="today-next" aria-label="Planned next topics">
          <p className="today-next-label">After this</p>
          <ol>
            {nextStops.map((stop, index) => (
              <li key={`${stop.conceptId}-${index}`}>
                <span aria-hidden="true">{String(index + 2).padStart(2, "0")}</span>
                <strong>{stop.name}</strong>
                <span>{stop.minutes} min</span>
              </li>
            ))}
          </ol>
          <p className="today-next-note">Your answer can change what comes next.</p>
        </aside>
      ) : null}
    </div>
  );
}
