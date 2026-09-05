"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const reveal = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function StepIcon({ type }: { type: "destination" | "evidence" | "plan" | "reroute" }) {
  if (type === "destination") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></svg>;
  }
  if (type === "evidence") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 9h8M8 13h5M8 17h7" /><path d="m15 12 1.5 1.5L20 10" /></svg>;
  }
  if (type === "plan") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /><path d="M7 3v6M14 9v6M10 15v6" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9a5 5 0 0 1 5 5v1M15 10l3 3 3-3M20 17h-9a5 5 0 0 1-5-5v-1M9 14l-3-3-3 3" /></svg>;
}

export function StartHereJourney() {
  const root = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const visible = useInView(root, { once: true, amount: 0.2 });
  const state = visible || reduceMotion ? "visible" : "hidden";

  return (
    <section ref={root} className="start-journey" aria-labelledby="start-journey-title">
      <div className="start-journey-head">
        <div>
          <p>Start here</p>
          <h2 id="start-journey-title">From exam date to next move.</h2>
        </div>
        <div>
          <p>
            Give Kelus a destination, then a little evidence. It turns both into today’s route and adjusts when your
            answers reveal something new.
          </p>
          <Link href="/today" className="start-journey-cta">
            Build my first route <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="start-route">
        <svg className="start-route-line" viewBox="0 0 1000 32" preserveAspectRatio="none" aria-hidden="true">
          <path className="start-route-base" d="M26 16H974" />
          <motion.path
            className="start-route-progress"
            d="M26 16H974"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={visible || reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="start-adapts">Kelus starts adapting here</span>

        <motion.ol
          initial={reduceMotion ? false : "hidden"}
          animate={state}
          variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } } }}
        >
          <motion.li variants={reveal} transition={{ duration: reduceMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}>
            <span className="start-node"><StepIcon type="destination" /></span>
            <p className="start-step-number">01</p>
            <h3>Set the destination</h3>
            <p>Exam, date, target, and time available.</p>
            <div className="start-fragment is-destination">
              <span>Example destination</span>
              <strong>Microeconomics final</strong>
              <div><b>21 days</b><b>45 min today</b></div>
            </div>
            <Link href="/today">Set mine <span aria-hidden="true">→</span></Link>
          </motion.li>

          <motion.li variants={reveal} transition={{ duration: reduceMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}>
            <span className="start-node"><StepIcon type="evidence" /></span>
            <p className="start-step-number">02</p>
            <h3>Show what you know</h3>
            <p>Rate familiarity, then try a short recall check.</p>
            <div className="start-fragment is-evidence">
              <span>Confidence + recall</span>
              <strong>Elasticity</strong>
              <div><i /><i className="is-on" /><i /></div>
            </div>
            <Link href="/today">Start the check <span aria-hidden="true">→</span></Link>
          </motion.li>

          <motion.li variants={reveal} transition={{ duration: reduceMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}>
            <span className="start-node"><StepIcon type="plan" /></span>
            <p className="start-step-number">03</p>
            <h3>Follow today’s route</h3>
            <p>Kelus puts the highest-value learning first.</p>
            <div className="start-fragment is-plan">
              <span>First action</span>
              <div><b>01</b><strong>Elasticity</strong><b>20 min</b></div>
              <i><em /></i>
            </div>
            <Link href="/today">Open Today <span aria-hidden="true">→</span></Link>
          </motion.li>

          <motion.li variants={reveal} transition={{ duration: reduceMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}>
            <span className="start-node"><StepIcon type="reroute" /></span>
            <p className="start-step-number">04</p>
            <h3>Answer, then reroute</h3>
            <p>“Almost” or “Knew it” changes what comes next.</p>
            <div className="start-fragment is-reroute">
              <span>New evidence</span>
              <div><b>Almost</b><span aria-hidden="true">→</span><strong>Moved forward</strong></div>
            </div>
            <Link href="/route">See the logic <span aria-hidden="true">→</span></Link>
          </motion.li>
        </motion.ol>
      </div>
    </section>
  );
}
