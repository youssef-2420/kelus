"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const before = ["Externalities", "Monetary policy", "Elasticity"] as const;
const after = ["Elasticity", "Externalities", "Monetary policy"] as const;

export function RerouteIllustration() {
  const [updated, setUpdated] = useState(false);
  const reduce = useReducedMotion() === true;
  const topics = updated ? after : before;

  return (
    <div className="v1-reroute">
      <header>
        <div>
          <span>Retrieval check</span>
          <strong>Elasticity</strong>
        </div>
        <div className="v1-reroute-controls" aria-label="Preview route state">
          <button type="button" className={!updated ? "is-active" : undefined} onClick={() => setUpdated(false)}>
            Before
          </button>
          <button type="button" className={updated ? "is-active" : undefined} onClick={() => setUpdated(true)}>
            After “Almost”
          </button>
        </div>
      </header>

      <div className="v1-answer" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={updated ? "updated" : "waiting"}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {updated ? "New evidence: keep Elasticity close." : "The route before this answer."}
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.ol layout aria-label={updated ? "Updated study order" : "Previous study order"}>
        {topics.map((topic, index) => (
          <motion.li
            layout
            key={topic}
            className={updated && topic === "Elasticity" ? "is-priority" : undefined}
            transition={{ type: "spring", bounce: 0, duration: reduce ? 0 : 0.38 }}
          >
            <span>0{index + 1}</span>
            <strong>{topic}</strong>
            <small>{updated && topic === "Elasticity" ? "Moved forward" : index === 0 ? "Next" : "Later"}</small>
          </motion.li>
        ))}
      </motion.ol>

      <button type="button" className="v1-almost" onClick={() => setUpdated((current) => !current)}>
        {updated ? "Reset example" : "Mark answer “Almost”"}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
