"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { kelusDuration, kelusEase } from "@/components/motion";

const ROUTE = [
  { name: "Osmosis", minutes: 18, reason: "Needs another attempt", recommended: true },
  { name: "Cell respiration", minutes: 15, reason: "High exam value", recommended: false },
  { name: "Homeostasis", minutes: 12, reason: "Builds on both", recommended: false },
] as const;

/**
 * Quiet Notion-style page mock for the hero.
 * Shows the real loop (recall → route) without sidebar/doodle clutter.
 */
export function NotionRevisionBoard() {
  const reduce = useReducedMotion() === true;
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      className="notion-board is-honest-flow is-clean"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{
        duration: reduce ? 0 : kelusDuration.moderate,
        delay: reduce ? 0 : kelusDuration.instant,
        ease: kelusEase,
      }}
    >
      <div className="notion-board-shell">
        <div className="notion-board-chrome">
          <span /><span /><span />
        </div>

        <div className="notion-board-main">
          <header className="notion-board-head">
            <p className="board-example-label">Sample revision · try the question</p>
            <h2>
              <em className="notion-page-mark" />
              Molecular Biology
            </h2>
            <p className="notion-board-steps">
              <span className="is-active">Recall</span>
              <span aria-hidden="true">·</span>
              <span>Check</span>
              <span aria-hidden="true">·</span>
              <span>Route</span>
            </p>
          </header>

          <div className="notion-flow">
            <div className="notion-flow-recall">
              <p className="notion-flow-question">
                Why does water move across a selectively permeable membrane?
              </p>
              <button type="button" className="notion-flow-reveal" aria-expanded={revealed} aria-controls="board-answer" onClick={() => setRevealed(!revealed)}>
                {revealed ? "Hide answer" : "Reveal answer"}
                <span aria-hidden="true">{revealed ? "−" : "+"}</span>
              </button>
              {revealed && <p id="board-answer" className="board-answer">Water moves by osmosis toward the side with a higher solute concentration, across a membrane that lets water pass.</p>}
            </div>

            <div className="notion-flow-route">
              <div className="notion-flow-route-title">
                <span>Today’s route</span>
                <strong>45 min</strong>
              </div>
              <ul>
                {ROUTE.map((item, index) => (
                  <li key={item.name} className={item.recommended ? "is-recommended" : undefined}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.reason}</small>
                    </div>
                    <b>{item.minutes}m</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
