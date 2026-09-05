"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Concept, LearningActivity, RoutePlan } from "@/domain/types";
import { conciseReason, REASON_COPY } from "@/lib/learning-copy";
import { confidenceLabel, percent } from "@/lib/format";

export function TodayRoute({ route, concepts, activities, onStart }: { route: RoutePlan; concepts: Concept[]; activities: LearningActivity[]; onStart: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const [first, ...remaining] = route.allocations;

  if (!first) {
    return <div className="today-route-empty"><p>No study action is ready yet.</p><small>Review the Knowledge Map or add course material to create a route.</small></div>;
  }

  const firstConcept = concepts.find((item) => item.id === first.conceptId);
  const firstActivity = activities.find((item) => item.conceptId === first.conceptId);
  const firstName = firstConcept?.name ?? "Mixed Retrieval";

  return (
    <div className="today-route-execution">
      <motion.article
        className="today-lead-action"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.24 }}
      >
        <div className="today-lead-label"><span>01</span><strong>Start here</strong></div>
        <div className="today-lead-main">
          <div>
            <h3>{firstName}</h3>
            <p>{conciseReason(first.reasons)}</p>
            <small>{firstConcept ? confidenceLabel(firstConcept.confidence) : "Mixed evidence"}</small>
          </div>
          <div className="today-lead-time"><strong>{first.minutes}</strong><span>minutes</span></div>
        </div>
        <div className="today-lead-sequence">
          <ol aria-label={`Learning sequence for ${firstName}`}><li>Learn</li><li>Retrieve</li><li>Apply</li><li>Evaluate</li></ol>
          <small>{firstActivity?.sourceReferences.length ? `Grounded in ${firstActivity.sourceReferences.length} confirmed course source${firstActivity.sourceReferences.length === 1 ? "" : "s"}.` : "Uses the current course model; no uploaded source is cited yet."}</small>
        </div>
        <button type="button" className="cta today-start" onClick={onStart}>Start learning <span aria-hidden="true">→</span></button>
      </motion.article>

      {remaining.length ? <div className="today-queue-label"><span>Then</span><small>{remaining.length} more action{remaining.length === 1 ? "" : "s"}</small></div> : null}
      <ol className="today-plan-list">
      {remaining.map((allocation, index) => {
        const concept = concepts.find((item) => item.id === allocation.conceptId);
        const activity = activities.find((item) => item.conceptId === allocation.conceptId);
        const name = concept?.name ?? "Mixed Retrieval";
        const open = openId === allocation.conceptId;
        return (
          <motion.li layout={!reduceMotion} key={allocation.conceptId}>
            <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : allocation.conceptId)}>
              <span className="plan-index">{String(index + 2).padStart(2, "0")}</span>
              <span className="plan-topic"><strong>{name}</strong><small>{conciseReason(allocation.reasons)}</small><em>{concept ? confidenceLabel(concept.confidence) : "Mixed evidence"}</em></span>
              <span className="plan-time"><strong>{allocation.minutes}</strong><small>MIN</small><i aria-hidden="true">{open ? "−" : "+"}</i></span>
            </button>
            <AnimatePresence initial={false}>
              {open && concept ? (
                <motion.div className="plan-reasoning" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reduceMotion ? 0.1 : 0.22 }}>
                  <p><span>{percent(concept.mastery)}</span> estimated mastery</p>
                  <div>
                    <p className="kicker">Why now?</p>
                    <ul>{allocation.reasons.slice(0, 4).map((reason) => <li key={reason}>{REASON_COPY[reason]}</li>)}</ul>
                    <div className="plan-execution">
                      <p className="kicker">Inside these {allocation.minutes} minutes</p>
                      <ol aria-label={`Learning sequence for ${name}`}><li>Learn</li><li>Retrieve</li><li>Apply</li><li>Evaluate and reroute</li></ol>
                      <small>{activity?.sourceReferences.length ? `Grounded in ${activity.sourceReferences.length} confirmed course source${activity.sourceReferences.length === 1 ? "" : "s"}.` : "Uses the current course model; no uploaded source is cited yet."}</small>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.li>
        );
      })}
      </ol>
      <p className="today-reroute-note">After the session, Kelus uses your answers to reorder what comes next.</p>
    </div>
  );
}
