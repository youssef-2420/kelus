"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import BlurText from "@/components/BlurText";

const stages = [
  {
    number: "01",
    label: "Give Kelus the course",
    body: "Add a syllabus, lecture PDF, notes, or a past exam. Kelus keeps the source attached to the concepts you confirm.",
    visual: "materials",
  },
  {
    number: "02",
    label: "Build the Knowledge Map",
    body: "Course topics become connected concepts. You confirm the structure instead of manually drawing a complicated graph.",
    visual: "map",
  },
  {
    number: "03",
    label: "Show what you know",
    body: "A short confidence and recall check gives Kelus its first evidence. It is a starting estimate, not a grade prediction.",
    visual: "diagnosis",
  },
  {
    number: "04",
    label: "Open Today",
    body: "Kelus ranks the next actions by exam value, current understanding, prerequisites, retention, and the time available.",
    visual: "today",
  },
  {
    number: "05",
    label: "Learn inside the route",
    body: "Each session moves through learning, retrieval, application, and evaluation—with the relevant source page when one is confirmed.",
    visual: "session",
  },
  {
    number: "06",
    label: "Your answer changes the route",
    body: "New evidence updates the learner model. If another concept becomes more valuable, tomorrow’s order changes quietly.",
    visual: "reroute",
  },
] as const;

function StageVisual({ type }: { type: (typeof stages)[number]["visual"] }) {
  if (type === "materials") return (
    <div className="how-material-fragment" aria-label="Example confirmed course sources">
      <p><span>PDF</span><strong>Microeconomics syllabus</strong><small>12 pages</small></p>
      <p><span>PDF</span><strong>Lecture 04 · Elasticity</strong><small>Page 7 cited</small></p>
    </div>
  );
  if (type === "map") return (
    <div className="how-map-fragment" aria-label="Example concept relationship">
      <span>Supply &amp; Demand</span><i aria-hidden="true">→</i><strong>Elasticity</strong><i aria-hidden="true">→</i><span>Market Structures</span>
    </div>
  );
  if (type === "diagnosis") return (
    <div className="how-diagnosis-fragment" aria-label="Example confidence check">
      <p>How well can you explain Elasticity?</p>
      <div><span>Not yet</span><strong>Somewhat</strong><span>Confident</span></div>
      <small>Next: one short recall question</small>
    </div>
  );
  if (type === "today") return (
    <ol className="how-today-fragment" aria-label="Example daily route">
      <li><span>01</span><strong>Elasticity</strong><b>18 min</b></li>
      <li><span>02</span><strong>Monetary Policy</strong><b>15 min</b></li>
      <li><span>03</span><strong>Market Structures</strong><b>10 min</b></li>
    </ol>
  );
  if (type === "session") return (
    <div className="how-session-fragment" aria-label="Example learning session">
      <div><span>01 / 04</span><small>Retrieve</small></div>
      <p>Why does demand become more elastic when close substitutes exist?</p>
      <span className="how-answer-line">Write your explanation…</span>
    </div>
  );
  return (
    <div className="how-reroute-fragment" aria-label="Example route update">
      <div><span>Elasticity</span><b>42%</b><i aria-hidden="true">→</i><strong>54%</strong></div>
      <p><span>Moved forward</span><strong>Monetary Policy</strong></p>
    </div>
  );
}

export function HowItWorks() {
  const reduceMotion = useReducedMotion() === true;
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.22 }, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <div className="how-page">
      <section className="how-hero" aria-labelledby="how-title">
        <p className="kicker">How Kelus works</p>
        <BlurText as="h1" id="how-title" text="One route from course material to exam readiness." delay={58} className="how-title" />
        <div className="how-hero-foot">
          <p>Kelus decides what deserves your time, then gives you the place to learn it. Every answer becomes evidence for what comes next.</p>
          <Link className="cta" href="/today">Build my route <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="how-loop" aria-label="The Kelus learning loop">
        <header><span>The loop</span><p>Setup happens once. Learning and rerouting repeat until the exam.</p></header>
        <ol>
          {stages.map((stage) => (
            <motion.li key={stage.number} {...reveal}>
              <span className="how-stage-number">{stage.number}</span>
              <div className="how-stage-copy"><h2>{stage.label}</h2><p>{stage.body}</p></div>
              <StageVisual type={stage.visual} />
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="how-principle">
        <p className="kicker">The principle</p>
        <h2>Kelus does the routing. You do the learning.</h2>
        <dl>
          <div><dt>Not a generic AI tutor</dt><dd>The learner model—not a chat window—decides the route.</dd></div>
          <div><dt>Not a grade prediction</dt><dd>Readiness is an estimate built from the evidence you provide.</dd></div>
          <div><dt>Not a fixed schedule</dt><dd>Miss a day or struggle with a concept and the route recalculates.</dd></div>
        </dl>
      </section>

      <footer className="how-final">
        <p>Give Kelus one course. Get the next right move.</p>
        <Link className="cta" href="/today">Start with my course <span aria-hidden="true">→</span></Link>
      </footer>
    </div>
  );
}
