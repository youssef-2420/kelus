"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { LEARNING_EXAMPLES } from "@/data/learning-examples";
import { kelusDuration, kelusEase, kelusMotion } from "@/components/motion";

const ease = kelusEase;
const dur = kelusDuration;

/** Interactive Kelus route example — clean page chrome below the hero. */
export function HeroProductDemo() {
  const reduceMotion = useReducedMotion() === true;
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showBefore, setShowBefore] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [practiceResult, setPracticeResult] = useState<"again" | "remembered" | null>(null);
  const example = LEARNING_EXAMPLES[exampleIndex];
  const route = showBefore ? [...example.route.slice(1), example.route[0]] : example.route;

  return (
    <div
      className="hero-product-demo folio-product-demo notion-product-demo is-clean"
      aria-label="Interactive example of a Kelus study route"
    >
      <div className="notion-product-shell">
        <div className="notion-product-chrome" aria-hidden="true">
          <span /><span /><span />
        </div>

        <div className="notion-product-main">
          <header className="hero-demo-head">
            <div className="hero-demo-identity">
              <strong>
                <em className="notion-product-page-mark" aria-hidden="true" />
                {example.course}
              </strong>
              <span>Example · not saved</span>
            </div>
            <div className="hero-demo-tabs" role="group" aria-label="Choose an example course">
              {LEARNING_EXAMPLES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={index === exampleIndex}
                  onClick={() => {
                    setExampleIndex(index);
                    setShowBefore(false);
                    setAnswerOpen(false);
                    setPracticeResult(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={example.id}
              className="hero-demo-body"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : dur.moderate, ease }}
            >
              <section className="hero-recall" aria-label="Try a revision question">
                <ol className="hero-recall-steps" aria-label="Example revision steps">
                  <li aria-current={!answerOpen ? "step" : undefined}>01 Recall</li>
                  <li aria-current={answerOpen && !practiceResult ? "step" : undefined}>02 Check</li>
                  <li aria-current={practiceResult ? "step" : undefined}>03 Revisit</li>
                </ol>
                <h2>{example.question}</h2>
                <p className="hero-recall-instruction">Try answering in your head. Then check the reasoning.</p>
                <button
                  type="button"
                  className="hero-reveal-button"
                  aria-expanded={answerOpen}
                  aria-controls="hero-example-answer"
                  onClick={() => {
                    setAnswerOpen(!answerOpen);
                    setPracticeResult(null);
                  }}
                >
                  {answerOpen ? "Hide answer" : "Reveal answer"}
                  <span aria-hidden="true">{answerOpen ? "−" : "+"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {answerOpen ? (
                    <motion.div
                      id="hero-example-answer"
                      className="hero-recall-answer"
                      key="answer"
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : dur.fast, ease }}
                    >
                      <p>{example.answer}</p>
                      <div className="hero-recall-actions" role="group" aria-label="Try an example outcome">
                        <button
                          type="button"
                          aria-pressed={practiceResult === "again"}
                          onClick={() => {
                            setPracticeResult("again");
                            setShowBefore(false);
                          }}
                        >
                          Practise again
                        </button>
                        <button
                          type="button"
                          aria-pressed={practiceResult === "remembered"}
                          onClick={() => {
                            setPracticeResult("remembered");
                            setShowBefore(true);
                          }}
                        >
                          I remembered it
                        </button>
                      </div>
                      <p className="hero-recall-result" role="status">
                        {practiceResult === "again"
                          ? "Example: keep this topic near the front for another attempt."
                          : practiceResult === "remembered"
                            ? "Example: move on to another topic, then return to this one later."
                            : "Try either outcome to see the example order change. Actual sessions check your written answers."}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>

              <div className="hero-demo-route">
                <div className="hero-demo-route-title">
                  <span>Today’s route</span>
                  <strong>Example · 45 minutes</strong>
                </div>
                <ol>
                  {route.map((item, index) => (
                    <motion.li
                      key={item.name}
                      layout={reduceMotion ? false : "position"}
                      className={!showBefore && index === 0 ? "is-recommended" : undefined}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: reduceMotion ? 0 : dur.moderate,
                        ease,
                        layout: { duration: reduceMotion ? 0 : dur.slow, ease },
                      }}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.reason}</small>
                      </div>
                      <b>{item.minutes} min</b>
                    </motion.li>
                  ))}
                </ol>
              </div>

              <p className="hero-demo-signal" aria-live="polite">
                <span aria-hidden="true">↳</span>
                {practiceResult === "remembered"
                  ? "A stronger answer can make room to practise another topic."
                  : example.signal}
              </p>
              <motion.button
                type="button"
                className="hero-demo-replay"
                onClick={() => {
                  setShowBefore(false);
                  setAnswerOpen(false);
                  setPracticeResult(null);
                }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={kelusMotion.press}
              >
                Reset example
                <span aria-hidden="true">↶</span>
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
