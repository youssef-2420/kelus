"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { kelusDuration, kelusEase } from "@/components/motion";

type Phase = "recall" | "check" | "route";

type RouteItem = {
  name: string;
  minutes: number;
  reason: string;
  recommended: boolean;
};

const BASE_ROUTE: RouteItem[] = [
  { name: "Osmosis", minutes: 18, reason: "Needs another attempt", recommended: true },
  { name: "Cell respiration", minutes: 15, reason: "High exam value", recommended: false },
  { name: "Homeostasis", minutes: 12, reason: "Builds on both", recommended: false },
];

/**
 * Open notebook sheet — ruled paper, binder holes, ink diagram.
 * Interactive sample: recall → check → route reacts to the answer.
 */
export function NotionRevisionBoard() {
  const reduce = useReducedMotion() === true;
  const [phase, setPhase] = useState<Phase>("recall");
  const [revealed, setRevealed] = useState(false);
  const [route, setRoute] = useState<RouteItem[]>(BASE_ROUTE);
  const [signal, setSignal] = useState<string | null>(null);

  function reveal() {
    setRevealed(true);
    setPhase("check");
    setSignal(null);
  }

  function hide() {
    setRevealed(false);
    setPhase("recall");
    setRoute(BASE_ROUTE);
    setSignal(null);
  }

  function markShaky() {
    setPhase("route");
    setRoute([
      { name: "Osmosis", minutes: 18, reason: "Needs another attempt", recommended: true },
      { name: "Cell respiration", minutes: 15, reason: "High exam value", recommended: false },
      { name: "Homeostasis", minutes: 12, reason: "Builds on both", recommended: false },
    ]);
    setSignal("Osmosis moves up for another attempt.");
  }

  function markRemembered() {
    setPhase("route");
    setRoute([
      { name: "Cell respiration", minutes: 15, reason: "High exam value", recommended: true },
      { name: "Homeostasis", minutes: 12, reason: "Builds on both", recommended: false },
      { name: "Osmosis", minutes: 12, reason: "Reviewed just now", recommended: false },
    ]);
    setSignal("Osmosis can wait — respiration comes next.");
  }

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
            </div>
            <svg
              className="paper-membrane"
              viewBox="0 0 280 140"
              role="img"
              aria-label="Ink diagram: water crosses a membrane toward higher solute concentration"
            >
              <path
                d="M24 28h232v84H24z"
                fill="#f7f4ee"
                stroke="#1a1a1a"
                strokeWidth="1.4"
              />
              <path
                d="M140 32v76"
                fill="none"
                stroke="#097fe8"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="2 6"
              />
              <circle cx="64" cy="58" r="4" fill="#097fe8" />
              <circle cx="86" cy="78" r="4" fill="#097fe8" />
              <circle cx="58" cy="92" r="4" fill="#097fe8" />
              <circle cx="198" cy="54" r="7" fill="#ffb110" stroke="#1a1a1a" strokeWidth="1.1" />
              <circle cx="222" cy="78" r="7" fill="#ffb110" stroke="#1a1a1a" strokeWidth="1.1" />
              <circle cx="196" cy="96" r="7" fill="#ffb110" stroke="#1a1a1a" strokeWidth="1.1" />
              <path
                d="M96 74h36"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M124 68l10 6-10 6"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x="48" y="122" fill="#5c574f" fontSize="10" fontFamily="ui-sans-serif, system-ui, sans-serif">
                water
              </text>
              <text x="188" y="122" fill="#5c574f" fontSize="10" fontFamily="ui-sans-serif, system-ui, sans-serif">
                solute
              </text>
            </svg>
          </div>

          <header className="notion-board-head">
            <p className="board-example-label">Sample · Molecular Biology</p>
            <ol className="notion-board-steps" aria-label="Revision steps">
              <li
                className={phase === "recall" ? "is-active" : "is-done"}
                aria-current={phase === "recall" ? "step" : undefined}
              >
                Recall
              </li>
              <li
                className={phase === "check" ? "is-active" : phase === "route" ? "is-done" : undefined}
                aria-current={phase === "check" ? "step" : undefined}
              >
                Check
              </li>
              <li
                className={phase === "route" ? "is-active" : undefined}
                aria-current={phase === "route" ? "step" : undefined}
              >
                Route
              </li>
            </ol>
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
                onClick={() => (revealed ? hide() : reveal())}
              >
                {revealed ? "Hide answer" : "Reveal answer"}
                <span aria-hidden="true">{revealed ? "−" : "+"}</span>
              </button>

              <p id="board-answer" className="board-answer" hidden={!revealed} role={revealed ? "status" : undefined}>
                Water moves by osmosis toward the side with a higher solute concentration, across a membrane that lets water pass.
              </p>

              <AnimatePresence initial={false}>
                {revealed && phase === "check" ? (
                  <motion.div
                    key="grades"
                    className="notebook-grades"
                    role="group"
                    aria-label="How did that go?"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : kelusDuration.normal, ease: kelusEase }}
                  >
                    <button type="button" className="is-primary" onClick={markShaky}>
                      I was shaky
                    </button>
                    <button type="button" className="is-ghost" onClick={markRemembered}>
                      I remembered
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className={`notion-flow-route${phase === "route" ? " is-live" : ""}`}>
              <div className="notion-flow-route-title">
                <span>Today’s route</span>
                <strong>45 min</strong>
              </div>
              {signal ? (
                <p className="notebook-signal" role="status" aria-live="polite">
                  <span aria-hidden="true">↳</span> {signal}
                </p>
              ) : (
                <p className="notebook-signal is-quiet">Reveal, then mark how it went — the order updates.</p>
              )}
              <ul>
                {route.map((item, index) => (
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
