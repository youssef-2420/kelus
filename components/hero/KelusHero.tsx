"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { LEARNING_EXAMPLES } from "@/data/learning-examples";
import { StudentIllustration } from "./StudentIllustration";

const ease = [0.22, 1, 0.36, 1] as const;
const press = { type: "spring" as const, bounce: 0, stiffness: 420, damping: 28 };

export function KelusHero() {
  const reduceMotion = useReducedMotion() === true;
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showBefore, setShowBefore] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [practiceResult, setPracticeResult] = useState<"again" | "remembered" | null>(null);
  const example = LEARNING_EXAMPLES[exampleIndex];
  const route = showBefore ? [...example.route.slice(1), example.route[0]] : example.route;

  return (
    <section className="kelus-hero home-hero is-product-demo" aria-labelledby="home-hero-title">
      <div className="hero-atmosphere" aria-hidden="true">
        <span className="hero-atmosphere-mist" />
        <span className="hero-atmosphere-wash" />
        <span className="hero-atmosphere-beam" />
        <span className="hero-atmosphere-rule" />
      </div>

      <div className="kelus-hero-copy home-copy">
        <p className="kicker hero-rise" style={{ ["--hero-rise-delay" as string]: "40ms" }}>
          A little revision. Every day.
        </p>
        <h1 id="home-hero-title" className="hero-rise" style={{ ["--hero-rise-delay" as string]: "100ms" }}>
          Revise your lessons. Prepare for your exams.
        </h1>
        <p className="home-lede hero-rise" style={{ ["--hero-rise-delay" as string]: "160ms" }}>
          Bring your course notes. Practise recalling and applying what you’ve studied, check your answers,
          and revisit the topics that need more work before your exam.
        </p>
        <div className="home-actions hero-rise" style={{ ["--hero-rise-delay" as string]: "220ms" }}>
          <motion.div whileTap={reduceMotion ? undefined : { scale: 0.97 }} transition={press}>
            <Link href="/today?sample=1" className="cta home-cta">
              Try sample (~1 min) <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>
          <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }} transition={press}>
            <Link href="/today" className="home-secondary">
              Revise my course
            </Link>
          </motion.div>
        </div>
        <p className="hero-honesty hero-rise" style={{ ["--hero-rise-delay" as string]: "280ms" }}>
          Your lessons. Regular practice. Revision that adapts to your answers.
        </p>
      </div>

      <div
        className="hero-product-demo hero-rise"
        style={{ ["--hero-rise-delay" as string]: "180ms" }}
        aria-label="Interactive example of a Kelus study route"
      >
        <div className="hero-demo-glow" aria-hidden="true" />
        <header className="hero-demo-head">
          <div className="hero-demo-identity">
            <span>Interactive example · not saved</span>
            <strong>{example.course}</strong>
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
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease }}
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
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
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
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.28,
                      layout: { type: "spring", bounce: 0, duration: 0.38 },
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
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            >
              Reset example
              <span aria-hidden="true">↶</span>
            </motion.button>
          </motion.div>
        </AnimatePresence>
        <StudentIllustration className="hero-demo-student" />
      </div>
    </section>
  );
}
