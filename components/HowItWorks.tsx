"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { LEARNING_EXAMPLES, type LearningExample } from "@/data/learning-examples";
import styles from "./how/HowItWorks.module.css";

function SourceVisual({ example }: { example: LearningExample }) {
  return (
    <figure className={`${styles.visual} ${styles.sourceVisual}`} aria-label={`A course document proposes ${example.concepts.join(", ")} as revision topics for the student to confirm.`}>
      <div className={styles.sourceSheet} aria-hidden="true">
        <span className={styles.sheetTop}>01 / YOUR MATERIAL</span>
        <strong>{example.course}</strong>
        <span className={styles.sheetLine} /><span className={styles.sheetLine} /><span className={styles.sheetLineShort} />
        <span className={styles.sourceMark}>kept with the topic</span>
      </div>
      <span className={styles.sourceArrow} aria-hidden="true">→</span>
      <div className={styles.topicExtract} aria-hidden="true">
        <span className={styles.visualLabel}>Proposed topics</span>
        {example.concepts.map((concept, index) => <div key={concept}><span>0{index + 1}</span><strong>{concept}</strong></div>)}
        <small>Review before Kelus builds the route</small>
      </div>
    </figure>
  );
}

function RecallVisual({ example }: { example: LearningExample }) {
  return (
    <figure className={`${styles.visual} ${styles.recallVisual}`} aria-label={`A recall question about ${example.concepts[1]} leads into a short revision route.`}>
      <div className={styles.recallPaper} aria-hidden="true">
        <span className={styles.visualLabel}>A question from your lesson</span>
        <strong>{example.question}</strong>
        <span className={styles.answerRule} /><span className={styles.answerRuleShort} />
        <span className={styles.recallAnnotation}>Answer from memory, then check.</span>
      </div>
      <div className={styles.routePreview} aria-hidden="true">
        <span className={styles.visualLabel}>Today’s route</span>
        <span><b>01</b>{example.route[0].name}<em>{example.route[0].minutes} min</em></span>
        <span><b>02</b>{example.route[1].name}<em>{example.route[1].minutes} min</em></span>
      </div>
    </figure>
  );
}

function RerouteVisual({ example }: { example: LearningExample }) {
  return (
    <figure className={`${styles.visual} ${styles.rerouteVisual}`} aria-label={`After an uncertain answer, ${example.moved} is moved forward for more practice in the next route.`}>
      <div className={styles.answerEvidence} aria-hidden="true"><span className={styles.visualLabel}>Answer checked</span><strong>Needs another attempt</strong><p>One answer adds evidence. It does not decide everything.</p></div>
      <div className={styles.routeChange} aria-hidden="true">
        <span className={styles.visualLabel}>Next route</span>
        <div><span>01</span><strong>{example.concepts[1]}</strong></div>
        <div className={styles.movedTopic}><span>02</span><strong>{example.moved}</strong><em>moved forward ↑</em></div>
        <div><span>03</span><strong>{example.concepts[2]}</strong></div>
      </div>
    </figure>
  );
}

const stages = [
  { number: "01", cue: "Source", title: "Start with what you were taught.", body: "Add a syllabus, lecture PDF, notes, or a past exam. Kelus proposes topics; you confirm what belongs in your course. Each topic keeps a link back to its source.", detail: "Add the lessons you want to revise · Confirm your revision topics", Visual: SourceVisual, tone: "source" },
  { number: "02", cue: "Recall", title: "Show what you can recall.", body: "A short check gives Kelus a starting estimate. Then today’s route tells you what to practise first. Inside a session, retrieve an answer, apply the idea, and check your reasoning.", detail: "Show what you know · Start today’s revision · Review, recall, and apply", Visual: RecallVisual, tone: "recall" },
  { number: "03", cue: "Route", title: "See the route respond.", body: "A weak answer brings a topic forward; a stronger one gives it room. Your answer changes the route, so the next practice session reflects what actually happened—not a fixed schedule.", detail: "Your answer changes the route", Visual: RerouteVisual, tone: "route" },
] as const;

export function HowItWorks() {
  const reduceMotion = useReducedMotion() === true;
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = LEARNING_EXAMPLES[exampleIndex];

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="how-title">
        <p className={styles.eyebrow}>How Kelus works</p>
        <h1 id="how-title">Your lessons become <br />a better revision habit.</h1>
        <div className={styles.heroBottom}>
          <p>Bring your course. Recall what you know. Let each answer shape what you practise next.</p>
          <Link className={styles.primaryAction} href="/today">Set up my course<span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.exampleSwitcher}>
          <span>See it with</span>
          <div role="group" aria-label="Choose an example course">
            {LEARNING_EXAMPLES.map((item, index) => <button key={item.id} type="button" aria-pressed={index === exampleIndex} onClick={() => setExampleIndex(index)}>{item.label}</button>)}
          </div>
        </div>
      </section>
      <section className={styles.story} aria-label="The Kelus revision loop">
        <ol>
          {stages.map(({ number, cue, title, body, detail, Visual, tone }) => (
            <li key={number} className={styles.chapter} data-tone={tone}>
              <div className={styles.chapterText}>
                <span className={styles.chapterLabel}><span>{number}</span>{cue}</span>
                <h2>{title}</h2>
                <p>{body}</p>
                <span className={styles.chapterDetail}>{detail}</span>
              </div>
              <AnimatePresence initial={false} mode="sync">
                <motion.div key={`${example.id}-${number}`} className={styles.visualWrap} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} transition={{ duration: reduceMotion ? 0 : kelusDuration.normal, ease: kelusEase }}>
                  <Visual example={example} />
                </motion.div>
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.principle} aria-labelledby="how-principle-title">
        <p className={styles.eyebrow}>What Kelus does—and doesn’t do</p>
        <h2 id="how-principle-title">A route to practise.<br />Not a predicted grade.</h2>
        <p>Kelus uses your course material, exam date, and practice answers to choose what to revisit. Readiness is an estimate from that evidence, not a promise about your exam result.</p>
      </section>
      <footer className={styles.final}>
        <p>Ready to revise your own lessons?</p>
        <Link className={styles.primaryAction} href="/today">Set up my course<span aria-hidden="true">↗</span></Link>
      </footer>
    </div>
  );
}
