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
  { name: "Elasticity", minutes: 18, reason: "Needs another attempt", recommended: true },
  { name: "Supply & Demand", minutes: 15, reason: "High exam value", recommended: false },
  { name: "Market Structures", minutes: 12, reason: "Builds on both", recommended: false },
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
      { name: "Elasticity", minutes: 18, reason: "Needs another attempt", recommended: true },
      { name: "Supply & Demand", minutes: 15, reason: "High exam value", recommended: false },
      { name: "Market Structures", minutes: 12, reason: "Builds on both", recommended: false },
    ]);
    setSignal("Elasticity moves up for another attempt.");
  }

  function markRemembered() {
    setPhase("route");
    setRoute([
      { name: "Supply & Demand", minutes: 15, reason: "High exam value", recommended: true },
      { name: "Market Structures", minutes: 12, reason: "Builds on both", recommended: false },
      { name: "Elasticity", minutes: 12, reason: "Reviewed just now", recommended: false },
    ]);
    setSignal("Elasticity can wait — supply and demand comes next.");
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
              aria-label="Ink diagram: a flatter demand curve when substitutes make quantity more price-sensitive"
            >
              <path d="M24 28h232v84H24z" fill="#f7f8f5" stroke="#12160f" strokeWidth="1.4" />
              <path d="M48 100V44" fill="none" stroke="#12160f" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M48 100h168" fill="none" stroke="#12160f" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M60 52l140 40" fill="none" stroke="#8a8f84" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M60 60l140 20" fill="none" stroke="#1f6b45" strokeWidth="2.2" strokeLinecap="round" />
              <text x="52" y="40" fill="#4a5246" fontSize="9" fontFamily="ui-sans-serif, system-ui, sans-serif">P</text>
              <text x="214" y="112" fill="#4a5246" fontSize="9" fontFamily="ui-sans-serif, system-ui, sans-serif">Q</text>
              <text x="150" y="58" fill="#1f6b45" fontSize="9" fontFamily="ui-sans-serif, system-ui, sans-serif">more elastic</text>
            </svg>
          </div>

          <header className="notion-board-head">
            <p className="board-example-label">Sample · Microeconomics</p>
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
                Why does demand become more elastic when close substitutes exist?
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
                    Buyers can switch when price rises, so quantity demanded responds more strongly to the price change.
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
