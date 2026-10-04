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
  { name: "Supply & Demand", minutes: 18, reason: "Start with the foundation", recommended: true },
  { name: "Elasticity", minutes: 15, reason: "Check your recall next", recommended: false },
  { name: "Market Structures", minutes: 12, reason: "Builds on both", recommended: false },
];

const press = kelusMotion.press;
const spring = { type: "spring" as const, bounce: 0, duration: 0.45 };

/**
 * Open notebook sheet — source excerpt, recall, then a route that visibly changes.
 * Interactive sample: recall → check → route reacts to the answer.
 */
export function BookletRevisionBoard() {
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
      { name: "Elasticity", minutes: 20, reason: "Needs another attempt", recommended: true },
      { name: "Supply & Demand", minutes: 13, reason: "Review after Elasticity", recommended: false },
      { name: "Market Structures", minutes: 12, reason: "Builds on both", recommended: false },
    ]);
    setSignal("Elasticity moves from second to first for another attempt.");
  }

  function markRemembered() {
    setPhase("route");
    setRoute([
      { name: "Supply & Demand", minutes: 15, reason: "Start with the foundation", recommended: true },
      { name: "Market Structures", minutes: 12, reason: "Builds on both", recommended: false },
      { name: "Elasticity", minutes: 12, reason: "Reviewed just now", recommended: false },
    ]);
    setSignal("Elasticity can wait — supply and demand comes next.");
  }

  return (
    <motion.div
      className="booklet-board is-honest-flow is-clean is-paper-loop is-notebook is-elevated"
      initial={false}
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

        <div className="booklet-board-main">
          <div className="paper-source">
            <div className="paper-source-copy">
              <span className="paper-step">From the lecture · Elasticity</span>
              <p>
                When the price rises, buyers can <em>choose a close substitute.</em>
              </p>
            </div>
            <svg
              className="paper-substitutes"
              viewBox="0 0 280 140"
              aria-hidden="true"
            >
              <path d="M30 28h72v84H30zM178 28h72v84h-72z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M42 46h47M42 55h35M42 91h47M190 46h47M190 55h35M190 91h47" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M49 77h34M197 77h34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M113 62c18-20 38-20 54-4m-10-11 11 11-13 5" fill="none" stroke="#1f6b45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M167 82c-18 20-38 20-54 4m10 11-11-11 13-5" fill="none" stroke="#4a5246" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <header className="booklet-board-head">
            <p className="board-example-label">Sample · Microeconomics</p>
            <ol className="booklet-board-steps" aria-label="Revision steps">
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

          <div className="booklet-flow">
            <div className="booklet-flow-recall">
              <p className="booklet-flow-question">
                Why does demand become more elastic when close substitutes exist?
              </p>
              <motion.button
                type="button"
                tabIndex={0}
                className="booklet-flow-reveal"
                aria-expanded={revealed}
                aria-controls="board-answer"
                onClick={() => (revealed ? hide() : reveal())}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                transition={press}
              >
                {revealed ? "Hide answer" : "Reveal answer"}
                <span aria-hidden="true">{revealed ? "−" : "+"}</span>
              </motion.button>

              <div id="board-answer" hidden={!revealed}>
              <AnimatePresence initial={false}>
                {revealed ? (
                  <motion.p
                    key="answer"
                    className="board-answer"
                    role="status"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: reduce ? 0 : kelusDuration.normal, ease: kelusEase }}
                  >
                    Buyers can switch when price rises, so quantity demanded responds more strongly to the price change.
                  </motion.p>
                ) : null}
              </AnimatePresence>
              </div>

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

            <div className={`booklet-flow-route${phase === "route" ? " is-live" : ""}`}>
              <div className="booklet-flow-route-title">
                <span>Today’s route</span>
                <strong>{route.reduce((total, item) => total + item.minutes, 0)} min</strong>
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
