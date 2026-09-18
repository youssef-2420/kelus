"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan } from "@/domain/types";
import { kelusEase } from "@/components/motion";

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
  onStart,
  startLabel,
}: {
  route: RoutePlan;
  concepts: Concept[];
  activities: LearningActivity[];
  events: LearningEvent[];
  onStart: () => void;
  startLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [first] = route.allocations;

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
          <span>{first.minutes} min</span>
          {whisper ? <span>{whisper}</span> : null}
        </motion.p>
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
        <motion.button
          type="button"
          className="cta today-start"
          onClick={onStart}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          transition={pressSpring}
        >
          {startLabel ?? `Start ${firstName}`} <span aria-hidden="true">→</span>
        </motion.button>
      </motion.article>
    </div>
  );
}
