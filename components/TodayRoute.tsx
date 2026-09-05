"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Concept, LearningReasonCode, RoutePlan } from "@/domain/types";
import { percent } from "@/lib/format";

const SHORT: Partial<Record<LearningReasonCode, string>> = {
  HIGH_EXAM_VALUE: "High exam value",
  RETENTION_FADING: "Retention fading",
  LOW_MASTERY: "High-value gap",
  PREREQUISITE_GAP: "Builds on the route",
  HIGH_EXPECTED_GAIN: "Highest return now",
  REVIEW_DUE: "Retrieval",
  EXAM_APPROACHING: "Exam is close",
  LOW_CONFIDENCE_ESTIMATE: "Needs a check",
};

function line(reasons: LearningReasonCode[]) {
  const preferred: LearningReasonCode[] = ["HIGH_EXAM_VALUE", "RETENTION_FADING", "LOW_MASTERY", "PREREQUISITE_GAP"];
  const ordered = [...preferred.filter((code) => reasons.includes(code)), ...reasons.filter((code) => !preferred.includes(code))];
  return ordered
    .slice(0, 2)
    .map((reason) => SHORT[reason] ?? reason)
    .join(" · ");
}

export function TodayRoute({ route, concepts }: { route: RoutePlan; concepts: Concept[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  return (
    <ol className="today-plan-list">
      {route.allocations.map((allocation, index) => {
        const concept = concepts.find((item) => item.id === allocation.conceptId);
        const name = concept?.name ?? "Retrieval";
        const open = openId === allocation.conceptId;
        return (
          <motion.li
            layout={!reduceMotion}
            key={allocation.conceptId}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5, delay: reduceMotion ? 0 : 1.62 + index * 0.07 }}
          >
            <button type="button" aria-expanded={open} aria-controls={`plan-disclosure-${allocation.conceptId}`} onClick={() => setOpenId(open ? null : allocation.conceptId)}>
              <span className="plan-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="plan-topic">
                <strong>{name}</strong>
                <small>{line(allocation.reasons)}</small>
                <i className="plan-claim" aria-hidden="true">
                  <em style={{ width: `${Math.max(10, (allocation.minutes / route.availableMinutes) * 100)}%` }} />
                </i>
              </span>
              <span className="plan-time">
                <strong>{allocation.minutes}</strong>
                <small>MIN</small>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && concept ? (
                <motion.div
                  id={`plan-disclosure-${allocation.conceptId}`}
                  className="plan-reasoning"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
                >
                  <p>
                    <span>{percent(concept.mastery)}</span> estimated mastery
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ol>
  );
}
