"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Concept, LearningReasonCode, RoutePlan } from "@/domain/types";
import { percent } from "@/lib/format";

const SHORT: Partial<Record<LearningReasonCode, string>> = {
  HIGH_EXAM_VALUE: "High exam value",
  RETENTION_FADING: "Retention fading",
  LOW_MASTERY: "High-value gap",
  HIGH_EXPECTED_GAIN: "Review becoming valuable",
  REVIEW_DUE: "Review becoming valuable",
  EXAM_APPROACHING: "Exam is close",
  LOW_CONFIDENCE_ESTIMATE: "Needs a check",
};

function line(reasons: LearningReasonCode[], previousName?: string) {
  if (reasons.includes("PREREQUISITE_GAP") && previousName) return `Builds on ${previousName}`;
  const preferred: LearningReasonCode[] = ["HIGH_EXAM_VALUE", "RETENTION_FADING", "HIGH_EXPECTED_GAIN", "LOW_MASTERY"];
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
        const previous = route.allocations[index - 1];
        const previousName = previous ? concepts.find((item) => item.id === previous.conceptId)?.name : undefined;
        const name = concept?.name ?? "Retrieval";
        const open = openId === allocation.conceptId;
        return (
          <li key={allocation.conceptId}>
            <button type="button" aria-expanded={open} aria-controls={`plan-disclosure-${allocation.conceptId}`} onClick={() => setOpenId(open ? null : allocation.conceptId)}>
              <span className="plan-topic">
                <strong>{name}</strong>
                <small>{line(allocation.reasons, previousName)}</small>
              </span>
              <span className="plan-time">
                {allocation.minutes} min
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && concept ? (
                <motion.div
                  id={`plan-disclosure-${allocation.conceptId}`}
                  className="plan-reasoning"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                >
                  <p>
                    <span>{percent(concept.mastery)}</span> estimated mastery
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ol>
  );
}
