"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { kelusDuration, kelusEase } from "@/components/motion";

const ROUTE = [
  { name: "Osmosis", minutes: 18, reason: "Needs another attempt", recommended: true },
  { name: "Cell respiration", minutes: 15, reason: "High exam value", recommended: false },
  { name: "Homeostasis", minutes: 12, reason: "Builds on both", recommended: false },
] as const;

/**
 * Open notebook sheet — ruled paper, binder holes, ink diagram.
 * Interactive sample of the real loop (recall → check → route).
 */
export function NotionRevisionBoard() {
  const reduce = useReducedMotion() === true;
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      className="notion-board is-honest-flow is-clean is-paper-loop is-notebook"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{
        duration: reduce ? 0 : kelusDuration.moderate,
        delay: reduce ? 0 : kelusDuration.instant,
        ease: kelusEase,
      }}
    >
      <div className="notebook-sheet">
        <div className="notebook-holes" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <div className="notebook-ruled" aria-hidden="true" />

        <div className="notion-board-main">
          <div className="paper-source">
            <div className="paper-source-copy">
              <span className="paper-step">From your notes</span>
              <p>
                Small notes.
                <br />
                <em>Stronger recall.</em>
              </p>
              <span className="paper-source-caption">Cell membranes · sample page</span>
            </div>
            <svg
              className="paper-membrane"
              viewBox="0 0 280 160"
              role="img"
              aria-label="Ink diagram: water crosses a selectively permeable membrane toward higher solute concentration"
            >
              <rect x="8" y="14" width="264" height="132" rx="2" fill="#fbfaf8" stroke="#1a1a1a" strokeWidth="1.25" />
              <path
                d="M18 28c70-8 170-6 244 0v108c-74 8-174 6-244 0V28z"
                fill="#e8f2fb"
                stroke="#1a1a1a"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M136 26c-3 18-5 42-4 66c1 18 3 36 5 52"
                fill="none"
                stroke="#097fe8"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M148 28c-2 20-3 40-2 62c1 20 2 38 3 50"
                fill="none"
                stroke="#097fe8"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.55"
              />
              {[
                [42, 48],
                [68, 72],
                [54, 98],
                [88, 56],
                [76, 110],
              ].map(([cx, cy]) => (
                <circle key={`w-${cx}`} cx={cx} cy={cy} r="3.2" fill="#097fe8" />
              ))}
              {[
                [178, 44],
                [208, 68],
                [192, 92],
                [226, 54],
                [214, 108],
                [242, 86],
              ].map(([cx, cy]) => (
                <circle key={`s-${cx}`} cx={cx} cy={cy} r="5.5" fill="#ffb110" stroke="#1a1a1a" strokeWidth="1" />
              ))}
              <path
                d="M92 78c18-10 36-8 52 2"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M136 72l10 8-12 3"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x="42" y="142" fill="#615d59" fontSize="9" fontFamily="ui-sans-serif, system-ui, sans-serif">
                water →
              </text>
              <text x="188" y="142" fill="#615d59" fontSize="9" fontFamily="ui-sans-serif, system-ui, sans-serif">
                solute
              </text>
            </svg>
          </div>

          <header className="notion-board-head">
            <p className="board-example-label">Try this sample question</p>
            <h2>Molecular Biology</h2>
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
              <button
                type="button"
                className="notion-flow-reveal"
                aria-expanded={revealed}
                aria-controls="board-answer"
                onClick={() => setRevealed(!revealed)}
              >
                {revealed ? "Hide answer" : "Reveal answer"}
                <span aria-hidden="true">{revealed ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {revealed ? (
                  <motion.p
                    key="answer"
                    id="board-answer"
                    className="board-answer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : kelusDuration.normal, ease: kelusEase }}
                  >
                    Water moves by osmosis toward the side with a higher solute concentration, across a membrane that lets water pass.
                  </motion.p>
                ) : null}
              </AnimatePresence>
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
