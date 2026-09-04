"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeAfterHero() {
  const reduce = useReducedMotion() === true;

  return (
    <>
      <section className="home-argument" aria-labelledby="argument-title">
        <svg className="home-continue-route" viewBox="0 0 72 96" aria-hidden="true">
          <motion.path
            d="M 36 0 C 36 28, 18 46, 28 64 C 38 82, 36 88, 36 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            pathLength={1}
            initial={reduce ? false : { pathLength: 0, opacity: 0.15 }}
            whileInView={{ pathLength: 1, opacity: 0.7 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.05, ease }}
          />
        </svg>
        <Reveal className="home-argument-inner">
          <p className="kicker">Many possible paths. One intelligent route.</p>
          <h2 id="argument-title">Stop deciding what to study.</h2>
          <p>
            <span aria-hidden="true">↳</span> Kelus recalculates the highest-value learning action from your goal,
            knowledge, retention, and time.
          </p>
        </Reveal>
      </section>

      <section id="how" className="home-workbench" aria-labelledby="workbench-title">
        <Reveal className="workbench-intro">
          <p className="kicker">One plan, three signals</p>
          <h2 id="workbench-title">
            Small inputs.
            <br />
            A plan with an opinion.
          </h2>
          <p>No giant task list. Kelus uses what matters for the exam, what feels weak, and what has gone untouched.</p>
          <Link href="/today">
            Set up your exam <span aria-hidden="true">→</span>
          </Link>
        </Reveal>

        <ol className="workbench-stages">
          <li>
            <Reveal>
              <header>
                <span>01</span>
                <h3>Find the leverage</h3>
              </header>
              <div className="signal-board" aria-label="Example topic priorities">
                <div className="signal-head">
                  <span>Study next</span>
                  <span>Already strong</span>
                </div>
                <div className="signal-row is-priority">
                  <b>01</b>
                  <p>
                    <strong>Elasticity</strong>
                    <small>Low mastery · high exam value</small>
                  </p>
                  <i style={{ "--signal": "82%" } as React.CSSProperties} />
                </div>
                <div className="signal-row">
                  <b>02</b>
                  <p>
                    <strong>Market structures</strong>
                    <small>Medium mastery · high value</small>
                  </p>
                  <i style={{ "--signal": "62%" } as React.CSSProperties} />
                </div>
                <div className="signal-row">
                  <b>03</b>
                  <p>
                    <strong>Supply &amp; demand</strong>
                    <small>Strong · quick retrieval only</small>
                  </p>
                  <i style={{ "--signal": "28%" } as React.CSSProperties} />
                </div>
              </div>
            </Reveal>
          </li>
          <li>
            <Reveal delay={0.08}>
              <header>
                <span>02</span>
                <h3>Fit the time you have</h3>
              </header>
              <div className="time-board">
                <p className="engine-label">Today · Microeconomics</p>
                <div>
                  <strong>45 focused minutes</strong>
                  <b>
                    45<span>m</span>
                  </b>
                </div>
                <ol>
                  <li>
                    <span>01</span>
                    <p>
                      <b>Elasticity</b>
                      <small>High-value gap</small>
                    </p>
                    <strong>20 min</strong>
                  </li>
                  <li>
                    <span>02</span>
                    <p>
                      <b>Externalities</b>
                      <small>High-value gap</small>
                    </p>
                    <strong>15 min</strong>
                  </li>
                  <li>
                    <span>03</span>
                    <p>
                      <b>Market structures</b>
                      <small>Needs a baseline</small>
                    </p>
                    <strong>10 min</strong>
                  </li>
                </ol>
              </div>
            </Reveal>
          </li>
          <li>
            <Reveal delay={0.16}>
              <header>
                <span>03</span>
                <h3>Let the plan move</h3>
              </header>
              <div className="feedback-board">
                <div className="feedback-mark" aria-hidden="true">
                  ?
                </div>
                <div>
                  <p className="engine-label">After one question</p>
                  <strong>“Almost” is useful data.</strong>
                  <span>Kelus keeps the topic close, without starting the whole plan over.</span>
                </div>
                <footer>
                  <p>
                    Today <b>02</b>
                  </p>
                  <i aria-hidden="true">→</i>
                  <p>
                    Tomorrow <b>01</b>
                  </p>
                </footer>
              </div>
            </Reveal>
          </li>
        </ol>
      </section>

      <section className="home-principles" aria-labelledby="principles-title">
        <Reveal>
          <p className="kicker">What Kelus will not do</p>
          <h2 id="principles-title">No fake certainty.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <dl>
            <div>
              <dt>Not a grade prediction</dt>
              <dd>Readiness reflects the confidence you report, weighted by exam importance.</dd>
            </div>
            <div>
              <dt>Not a content generator</dt>
              <dd>Kelus organizes your topics. It does not replace your lecturer, notes, or judgment.</dd>
            </div>
            <div>
              <dt>Not another streak</dt>
              <dd>Miss a day and the plan simply recalculates. No guilt, confetti, or broken chain.</dd>
            </div>
          </dl>
        </Reveal>
      </section>

      <Reveal>
        <footer className="home-foot">
          <h2>Walk into the exam knowing what you worked on—and why.</h2>
          <div>
            <span className="mark">Kelus</span>
            <Link href="/today">
              Make today’s plan <span aria-hidden="true">→</span>
            </Link>
          </div>
        </footer>
      </Reveal>
    </>
  );
}
