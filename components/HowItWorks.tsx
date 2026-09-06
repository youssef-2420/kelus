"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import BlurText from "@/components/BlurText";
import { MaterialToMapIllustration, RerouteIllustration, TodayRouteIllustration } from "@/components/how/HowIllustrations";

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

const examples = [
  {
    id: "biology",
    label: "Biology",
    course: "Cell Biology",
    concepts: ["Cell membranes", "Osmosis", "Homeostasis"] as const,
    question: "Why does water move across a selectively permeable membrane?",
    moved: "Active transport",
  },
  {
    id: "computing",
    label: "Computer science",
    course: "Data Structures",
    concepts: ["Arrays", "Hash tables", "Graph traversal"] as const,
    question: "Why can a hash table retrieve a value without scanning every item?",
    moved: "Collision handling",
  },
  {
    id: "history",
    label: "History",
    course: "Modern History",
    concepts: ["Industrialization", "Labor movements", "Social reform"] as const,
    question: "How did industrialization change the bargaining power of workers?",
    moved: "Urbanization",
  },
] as const;

type LearningExample = (typeof examples)[number];

function StageVisual({ type, reduceMotion, example }: { type: (typeof stages)[number]["visual"]; reduceMotion: boolean; example: LearningExample }) {
  if (type === "materials") return <MaterialToMapIllustration reduceMotion={reduceMotion} concepts={example.concepts} />;
  if (type === "map") return (
    <div className="how-map-fragment" aria-label="Example concept relationship">
      <span>{example.concepts[0]}</span><i aria-hidden="true">→</i><strong>{example.concepts[1]}</strong><i aria-hidden="true">→</i><span>{example.concepts[2]}</span>
    </div>
  );
  if (type === "diagnosis") return (
    <div className="how-diagnosis-fragment" aria-label="Example confidence check">
      <p>How well can you explain {example.concepts[1]}?</p>
      <div><span>Not yet</span><strong>Somewhat</strong><span>Confident</span></div>
      <small>Next: one short recall question</small>
    </div>
  );
  if (type === "today") return <TodayRouteIllustration reduceMotion={reduceMotion} concepts={example.concepts} />;
  if (type === "session") return (
    <div className="how-session-fragment" aria-label="Example learning session">
      <div><span>01 / 04</span><small>Retrieve</small></div>
      <p>{example.question}</p>
      <span className="how-answer-line">Write your explanation…</span>
    </div>
  );
  return <RerouteIllustration reduceMotion={reduceMotion} concepts={example.concepts} moved={example.moved} />;
}

export function HowItWorks() {
  const reduceMotion = useReducedMotion() === true;
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = examples[exampleIndex];
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
        <div className="how-example-switcher" aria-label="Choose an example course">
          <span>See the loop with</span>
          <div role="tablist">
            {examples.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === exampleIndex} onClick={() => setExampleIndex(index)}>{item.label}</button>)}
          </div>
        </div>
      </section>

      <section className="how-loop" aria-label="The Kelus learning loop">
        <header><span>The loop</span><p>Setup happens once. Learning and rerouting repeat until the exam.</p></header>
        <ol>
          {stages.map((stage) => (
            <motion.li key={stage.number} {...reveal}>
              <span className="how-stage-number">{stage.number}</span>
              <div className="how-stage-copy"><h2>{stage.label}</h2><p>{stage.body}</p></div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${example.id}-${stage.visual}`} className="how-stage-visual" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: [0.16, 1, 0.3, 1] }}>
                  <StageVisual type={stage.visual} reduceMotion={reduceMotion} example={example} />
                </motion.div>
              </AnimatePresence>
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
