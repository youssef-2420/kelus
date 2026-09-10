"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { kelusDuration, kelusEase, kelusMotion } from "@/components/motion";

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

const press = kelusMotion.press;
const spring = { type: "spring" as const, bounce: 0, duration: 0.45 };

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
      className="notion-board is-honest-flow is-clean is-paper-loop is-notebook is-elevated"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : kelusDuration.moderate,
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
                fill="#f7f8f5"
                stroke="#12160f"
                strokeWidth="1.4"
              />
              <path
                d="M140 32v76"
                fill="none"
                stroke="#1f6b45"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="2 6"
              />
              <circle cx="64" cy="58" r="4" fill="#1f6b45" />
              <circle cx="86" cy="78" r="4" fill="#1f6b45" />
              <circle cx="58" cy="92" r="4" fill="#1f6b45" />
              <circle cx="198" cy="54" r="7" fill="#d4b56a" stroke="#12160f" strokeWidth="1.1" />
              <circle cx="222" cy="78" r="7" fill="#d4b56a" stroke="#12160f" strokeWidth="1.1" />
              <circle cx="196" cy="96" r="7" fill="#d4b56a" stroke="#12160f" strokeWidth="1.1" />
              <path
                d="M96 74h36"
                fill="none"
                stroke="#12160f"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M124 68l10 6-10 6"
                fill="none"
                stroke="#12160f"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x="48" y="122" fill="#4a5246" fontSize="10" fontFamily="ui-sans-serif, system-ui, sans-serif">
                water
              </text>
              <text x="188" y="122" fill="#4a5246" fontSize="10" fontFamily="ui-sans-serif, system-ui, sans-serif">
                solute
              </text>
            </svg>
          </div>

          <header className="notion-board-head">
            <p className="board-example-label">Sample · Molecular Biology</p>
            <ol className="notion-board-steps" aria-label="Revision steps">
              {(["recall", "check", "route"] as const).map((step) => {
                const label = step === "recall" ? "Recall" : step === "check" ? "Check" : "Route";
                const active = phase === step;
                const done =
                  (step === "recall" && phase !== "recall") ||
                  (step === "check" && phase === "route");
                return (
                  <li
                    key={step}
                    className={active ? "is-active" : done ? "is-done" : undefined}
                    aria-current={active ? "step" : undefined}
                  >
                    {label}
                  </li>
                );
              })}
            </ol>
          </header>

          <div className="notion-flow">
            <div className="notion-flow-recall">
              <p className="notion-flow-question">
                Why does water move across a selectively permeable membrane?
              </p>
              <motion.button
                type="button"
                className="notion-flow-reveal"
                aria-expanded={revealed}
                aria-controls="board-answer"
                onClick={() => (revealed ? hide() : reveal())}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                transition={press}
              >
                {revealed ? "Hide answer" : "Reveal answer"}
                <span aria-hidden="true">{revealed ? "−" : "+"}</span>
              </motion.button>

              <AnimatePresence initial={false}>
                {revealed ? (
                  <motion.p
                    key="answer"
                    id="board-answer"
                    className="board-answer"
                    role="status"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: reduce ? 0 : kelusDuration.normal, ease: kelusEase }}
                  >
                    Water moves by osmosis toward the side with a higher solute concentration, across a membrane that lets water pass.
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {revealed && phase === "check" ? (
                  <motion.div
                    key="grades"
                    className="notebook-grades"
                    role="group"
                    aria-label="How did that go?"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: reduce ? 0 : kelusDuration.normal, ease: kelusEase }}
                  >
                    <motion.button
                      type="button"
                      className="is-primary"
                      onClick={markShaky}
                      whileTap={reduce ? undefined : { scale: 0.97 }}
                      transition={press}
                    >
                      I was shaky
                    </motion.button>
                    <motion.button
                      type="button"
                      className="is-ghost"
                      onClick={markRemembered}
                      whileTap={reduce ? undefined : { scale: 0.98 }}
                      transition={press}
                    >
                      I remembered
                    </motion.button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className={`notion-flow-route${phase === "route" ? " is-live" : ""}`}>
              <div className="notion-flow-route-title">
                <span>Today’s route</span>
                <strong>45 min</strong>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={signal ?? "quiet"}
                  className={`notebook-signal${signal ? "" : " is-quiet"}`}
                  role="status"
                  aria-live="polite"
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: reduce ? 0 : kelusDuration.fast, ease: kelusEase }}
                >
                  {signal ? (
                    <>
                      <span aria-hidden="true">↳</span> {signal}
                    </>
                  ) : (
                    "Reveal, then mark how it went — the order updates."
                  )}
                </motion.p>
              </AnimatePresence>
              <LayoutGroup>
                <ul>
                  <AnimatePresence initial={false}>
                    {route.map((item, index) => (
                      <motion.li
                        key={item.name}
                        layout={!reduce}
                        className={item.recommended ? "is-recommended" : undefined}
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={reduce ? { duration: 0 } : spring}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.reason}</small>
                        </div>
                        <b>{item.minutes}m</b>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </LayoutGroup>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
