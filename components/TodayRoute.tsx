"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { Concept, LearningActivity, LearningEvent, RoutePlan } from "@/domain/types";
import { conciseReason } from "@/lib/learning-copy";
import { confidenceLabel } from "@/lib/format";

function citeLabel(source: { label: string; locator?: string | null } | undefined) {
  if (!source) return "Uses the current course model; no source is cited yet.";
  const locator = source.locator?.trim();
  if (!locator || /not your upload/i.test(locator)) return `Cited: ${source.label}.`;
  return `Cited: ${source.label} · ${locator}.`;
}

/**
 * Today is one next block — start it, then leave.
 * The rest of the route lives in Index, not as a planner under the CTA.
 */
export function TodayRoute({
  route,
  concepts,
  activities,
  events,
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
        <p className="kicker">Today</p>
        <h2>No study action is ready yet.</h2>
        <p>Add a page to the binder, or open the index so Kelus can pick a first block.</p>
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
  const latestEvidence = [...events]
    .filter((item) => item.conceptId === first.conceptId && (item.kind === "retrieval" || item.kind === "self_rating"))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const firstName = firstConcept?.name ?? "Mixed Retrieval";
  const learnerEvidence =
    latestEvidence?.kind === "retrieval"
      ? latestEvidence.outcome === "success"
        ? "Latest recall was strong"
        : latestEvidence.outcome === "partial"
          ? "Latest recall was partial"
          : "Latest recall was not yet secure"
      : latestEvidence?.selfRating
        ? `Initial familiarity: ${latestEvidence.selfRating.replace("_", " ")}`
        : "No answer evidence yet";

  return (
    <div className="today-route-execution is-one-next">
      <motion.article
        className="today-lead-action"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.24 }}
      >
        <div className="today-lead-label">
          <strong>Next</strong>
          <span className="today-lead-mins">{first.minutes} min</span>
        </div>
        <div className="today-lead-main">
          <div>
            <h3>{firstName}</h3>
            <p>{conciseReason(first.reasons)}</p>
            <button type="button" className="cta today-start" onClick={onStart}>
              {startLabel ?? `Start ${firstName}`} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <footer className="today-lead-foot">
          <p className="today-lead-cite">{citeLabel(firstSource)}</p>
          <details className="today-evidence-disclosure">
            <summary>Why this?</summary>
            <dl className="today-lead-evidence" aria-label={`Why ${firstName} is first`}>
              <div>
                <dt>From your course</dt>
                <dd>
                  {firstSource
                    ? `${firstSource.label}${firstSource.locator ? ` · ${firstSource.locator}` : ""}`
                    : "No source cited yet"}
                </dd>
              </div>
              <div>
                <dt>From your answers</dt>
                <dd>{learnerEvidence}</dd>
              </div>
              <div>
                <dt>Estimate</dt>
                <dd>{firstConcept ? confidenceLabel(firstConcept.confidence) : "Mixed evidence across weak spots"}</dd>
              </div>
              <div>
                <dt>Why first</dt>
                <dd>{conciseReason(first.reasons)}</dd>
              </div>
            </dl>
          </details>
        </footer>
      </motion.article>
    </div>
  );
}
