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
 * Quiet Notion-style page mock for the hero.
 * Shows the real loop (recall → route) without sidebar/doodle clutter.
 */
export function NotionRevisionBoard() {
  const reduce = useReducedMotion() === true;
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      className="notion-board is-honest-flow is-clean is-paper-loop"
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
          <div className="paper-source">
            <div><span className="paper-step">01 / YOUR NOTES</span><p>Small notes.<br /><em>Stronger recall.</em></p><span className="paper-source-caption">Example · cell membranes</span></div>
            <motion.svg initial={{ opacity: .75 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : kelusDuration.moderate, ease: kelusEase }} className="paper-membrane" viewBox="0 0 220 126" role="img" aria-label="Example notes diagram: water crosses a selectively permeable membrane toward higher solute concentration">
              <path d="M12 20 Q100 12 208 20 L208 101 Q110 110 12 101 Z" fill="#e6f3fe" stroke="#02093a" strokeWidth="1.5" />
              <path d="M105 18 Q99 58 105 105 M113 18 Q107 58 113 105" fill="none" stroke="#097fe8" strokeWidth="2" />
              {[ [30,36],[61,69],[39,87],[83,40],[145,30],[186,83] ].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#097fe8" />)}
              {[ [139,81],[173,34],[187,56],[151,51],[171,92] ].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="#ffb110" stroke="#02093a" strokeWidth="1" />)}
              <path d="M66 59 Q104 45 145 61 m-10-9 10 9-13 4" fill="none" stroke="#02093a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </div>
          <header className="notion-board-head">
            <p className="board-example-label">Sample revision · try the question</p>
            <h2>
              Molecular Biology
            </h2>
            <p className="notion-board-steps">
              <span className="is-active">02 Recall</span>
              <span aria-hidden="true">·</span>
              <span>03 Check</span>
              <span aria-hidden="true">·</span>
              <span>04 Route</span>
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
              <AnimatePresence initial={false}>
                {revealed && <motion.p key="answer" id="board-answer" className="board-answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : kelusDuration.normal, ease: kelusEase }}>Water moves by osmosis toward the side with a higher solute concentration, across a membrane that lets water pass.</motion.p>}
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
