"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { LEARNING_EXAMPLES } from "@/data/learning-examples";
import { StudentIllustration } from "./StudentIllustration";

export function KelusHero() {
  const reduceMotion = useReducedMotion() === true;
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = LEARNING_EXAMPLES[exampleIndex];

  return (
    <section className="kelus-hero home-hero is-product-demo" aria-labelledby="home-hero-title">
      <div className="kelus-hero-copy home-copy">
        <h1 id="home-hero-title">Your course is too big. Kelus makes today finishable.</h1>
        <p className="home-lede">
          Add the material and the exam date. Kelus turns what you know—and what you do not—into the next useful study
          session.
        </p>
        <div className="home-actions">
          <Link href="/today" className="cta home-cta">
            Build today’s route <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <a href="#route" className="home-secondary">
            See a route change
          </a>
        </div>
        <p className="hero-honesty">Your material. Your answers. No invented progress.</p>
      </div>

      <div className="hero-product-demo" aria-label="Interactive example of a Kelus study route">
        <header className="hero-demo-head">
          <span className="hero-window-controls" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="hero-demo-identity">
            <span>Example route</span>
            <strong>{example.course}</strong>
          </div>
          <div className="hero-demo-tabs" role="tablist" aria-label="Choose an example course">
            {LEARNING_EXAMPLES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === exampleIndex}
                onClick={() => setExampleIndex(index)}
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
                <span>Today’s route</span>
                <strong>Highest value first</strong>
              </div>
              <ol>
                {example.route.map((item, index) => (
                  <motion.li
                    key={item.name}
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : index * 0.045, duration: 0.2 }}
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
            <p className="hero-demo-signal">
              <span aria-hidden="true">↳</span>
              {example.signal}
            </p>
          </motion.div>
        </AnimatePresence>
        <StudentIllustration className="hero-demo-student" />
      </div>
    </section>
  );
}
