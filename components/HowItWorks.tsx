"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useState } from "react";
import { MaterialToMapIllustration, RerouteIllustration, TodayRouteIllustration } from "@/components/how/HowIllustrations";
import { LEARNING_EXAMPLES, type LearningExample } from "@/data/learning-examples";

const stages = [
  {
    number: "01",
    label: "Add the lessons you want to revise",
    body: "Add a syllabus, lecture PDF, notes, or a past exam. Kelus keeps the source attached to the concepts you confirm.",
    visual: "materials",
  },
  {
    number: "02",
    label: "Confirm your revision topics",
    body: "Review the topics proposed from your PDF. The topic map keeps them together with their source references.",
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
    label: "Start today’s revision",
    body: "Kelus suggests topics to practise using your recall checks, topic priorities, exam date, and available time.",
    visual: "today",
  },
  {
    number: "05",
    label: "Review, recall, and apply",
    body: "Review an explanation, answer from memory, and try an application question. Check your reasoning against the source before continuing.",
    visual: "session",
  },
  {
    number: "06",
    label: "Your answer changes the route",
    body: "Your answer results change what Kelus suggests next. Revisit weaker topics and keep practising through the days before your exam.",
    visual: "reroute",
  },
] as const;

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
  const example = LEARNING_EXAMPLES[exampleIndex];

  return (
    <div className="how-page is-notion-product">
      <section className="how-hero" aria-labelledby="how-title">
        <p className="kicker">How Kelus works</p>
        <h1 id="how-title" className="how-title">Your lessons. A regular revision habit.</h1>
        <div className="how-hero-foot">
          <p>Bring what you’ve studied. Recall it, practise using it, and review the parts that need another attempt before your exam.</p>
          <Link className="cta" href="/today?sample=1">Try sample (~1 min) <span aria-hidden="true">→</span></Link>
        </div>
        <div className="how-example-switcher" aria-label="Choose an example course">
          <span>See the loop with</span>
          <div role="tablist">
            {LEARNING_EXAMPLES.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === exampleIndex} onClick={() => setExampleIndex(index)}>{item.label}</button>)}
          </div>
        </div>
      </section>

      <section className="how-loop" aria-label="The Kelus learning loop">
        <header><span>The loop</span><p>Add your lessons once. Return for revision and practice until the exam.</p></header>
        <ol>
          {stages.map((stage) => (
            <li key={stage.number}>
              <span className="how-stage-number">{stage.number}</span>
              <div className="how-stage-copy"><h2>{stage.label}</h2><p>{stage.body}</p></div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${example.id}-${stage.visual}`} className="how-stage-visual" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? kelusDuration.micro : kelusDuration.normal, ease: kelusEase }}>
                  <StageVisual type={stage.visual} reduceMotion={reduceMotion} example={example} />
                </motion.div>
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </section>

      <section className="how-principle">
        <p className="kicker">The principle</p>
        <h2>One purpose: help you revise for your exam.</h2>
        <dl>
          <div><dt>Practice from your lessons</dt><dd>Review course ideas, answer from memory, and apply them.</dd></div>
          <div><dt>Not a grade prediction</dt><dd>Readiness is an estimate built from the evidence you provide.</dd></div>
          <div><dt>Revision that adapts</dt><dd>Your answers and the time available shape the next practice session.</dd></div>
        </dl>
      </section>

      <footer className="how-final">
        <p>Bring one lesson. Start practising for your exam.</p>
        <Link className="cta" href="/today?sample=1">Try sample (~1 min) <span aria-hidden="true">→</span></Link>
      </footer>
      <SiteFooter />
    </div>
  );
}
