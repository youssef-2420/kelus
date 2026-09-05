"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Concept, RoutePlan } from "@/domain/types";
import { conciseReason, REASON_COPY } from "@/lib/learning-copy";
import { percent } from "@/lib/format";

export function TodayRoute({ route, concepts }: { route: RoutePlan; concepts: Concept[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  return (
    <ol className="today-plan-list">
      {route.allocations.map((allocation, index) => {
        const concept = concepts.find((item) => item.id === allocation.conceptId);
        const name = concept?.name ?? "Mixed Retrieval";
        const open = openId === allocation.conceptId;
        return (
          <motion.li layout={!reduceMotion} key={allocation.conceptId}>
            <button type="button" aria-expanded={open} aria-controls={`plan-${allocation.conceptId}`} aria-label={`${name}, ${allocation.minutes} minutes. Why this now?`} onClick={() => setOpenId(open ? null : allocation.conceptId)}>
              <span className="plan-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="plan-topic"><strong>{name}</strong><small>{conciseReason(allocation.reasons)}</small></span>
              <span className="plan-time"><strong>{allocation.minutes}</strong><small>MIN</small></span>
            </button>
            <AnimatePresence initial={false}>
              {open && concept ? (
                <motion.div id={`plan-${allocation.conceptId}`} className="plan-reasoning" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reduceMotion ? 0.1 : 0.22, bounce: 0 }}>
                  <p><span>{percent(concept.mastery)}</span> estimated mastery</p>
                  <div><p className="kicker">Why now?</p><ul>{allocation.reasons.slice(0, 4).map((reason) => <li key={reason}>{REASON_COPY[reason]}</li>)}</ul></div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ol>
  );
}
