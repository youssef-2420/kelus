"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan } from "@/domain/types";

function citeWhisper(source: { label: string; locator?: string | null } | undefined) {
  if (!source) return null;
  const locator = source.locator?.trim();
  if (!locator || /not your upload/i.test(locator)) return source.label;
  return `${source.label} · ${locator}`;
}

/**
 * Today is one page: the next topic is the title.
 * No Next eyebrow, no planner, no evidence dashboard.
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
    <div className="today-route-execution is-one-next is-booklet-page">
      <motion.article
        className="today-lead-action is-page"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="today-page-folio">
          <span>{first.minutes} min</span>
          {whisper ? <span>{whisper}</span> : null}
        </p>
        <h1 id="today-title">{firstName}</h1>
        <button type="button" className="cta today-start" onClick={onStart}>
          {startLabel ?? `Start ${firstName}`} <span aria-hidden="true">→</span>
        </button>
      </motion.article>
    </div>
  );
}
