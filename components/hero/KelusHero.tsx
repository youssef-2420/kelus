"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { LEARNING_EXAMPLES } from "@/data/learning-examples";
import { StudentIllustration } from "./StudentIllustration";

export function KelusHero() {
  const reduceMotion = useReducedMotion() === true;
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showBefore, setShowBefore] = useState(false);
  const example = LEARNING_EXAMPLES[exampleIndex];
  const route = showBefore ? [...example.route.slice(1), example.route[0]] : example.route;

  return (
    <section className="kelus-hero home-hero is-product-demo" aria-labelledby="home-hero-title">
      <div className="kelus-hero-copy home-copy">
        <h1 id="home-hero-title">Your course is too big. Make today finishable.</h1>
        <p className="home-lede">
          Add the material and the exam date. Kelus turns what you know—and what you do not—into the next useful study
          session.
        </p>
        <div className="home-actions">
          <Link href="/today?sample=1" className="cta home-cta">
            Try sample (~1 min) <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/today" className="home-secondary">
            Build with my PDF
          </Link>
        </div>
        <p className="hero-honesty">Your material. Your answers. No invented progress.</p>
      </div>

      <div className="hero-product-demo" aria-label="Interactive example of a Kelus study route">
        <header className="hero-demo-head">
          <div className="hero-demo-identity">
            <span>Example route</span>
            <strong>{example.course}</strong>
          </div>
          <div className="hero-demo-tabs" role="group" aria-label="Choose an example course">
            {LEARNING_EXAMPLES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={index === exampleIndex}
                onClick={() => { setExampleIndex(index); setShowBefore(false); }}
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
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-demo-context">
              <div>
                <span>Exam</span>
                <strong>{example.destination}</strong>
              </div>
              <dl>
                <div>
                  <dt>Days left</dt>
                  <dd>{example.days}</dd>
                </div>
                <div>
                  <dt>Today</dt>
                  <dd>45 min</dd>
                </div>
              </dl>
            </div>
            <div className="hero-demo-route">
              <div className="hero-demo-route-title">
                <span>{showBefore ? "Before the example answer" : "Today’s route"}</span>
                <strong>{showBefore ? "Previous order" : "Highest value first"}</strong>
              </div>
              <ol>
                {route.map((item, index) => (
                  <motion.li
                    key={item.name}
                    layout={reduceMotion ? false : "position"}
                    className={!showBefore && index === 0 ? "is-recommended" : undefined}
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28, layout: { type: "spring", bounce: 0, duration: 0.38 } }}
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
              {showBefore ? "An uncertain answer gives Kelus a reason to reconsider the order." : example.signal}
            </p>
            <motion.button
              type="button"
              className="hero-demo-replay"
              aria-pressed={showBefore}
              onClick={() => setShowBefore((value) => !value)}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            >
              {showBefore ? "Apply the example answer" : "Replay this decision"}
              <span aria-hidden="true">{showBefore ? "→" : "↶"}</span>
            </motion.button>
          </motion.div>
        </AnimatePresence>
        <StudentIllustration className="hero-demo-student" />
      </div>
    </section>
  );
}
