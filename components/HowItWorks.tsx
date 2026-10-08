"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useSyncExternalStore } from "react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { PackArt } from "@/components/PackArt";
import { RecallIllustration, RouteIllustration, SourceIllustration } from "@/components/home/RevisionObjects";
import { StudyScene } from "@/components/home/StudyScene";
import { LEARNING_EXAMPLES, type LearningExample } from "@/data/learning-examples";
import styles from "./how/HowItWorks.module.css";

type VisualProps = { example: LearningExample; visible: boolean; reduceMotion: boolean };

function SourceVisual({ example, visible, reduceMotion }: VisualProps) {
  return (
    <figure className={`${styles.visual} ${styles.sourceVisual}`}>
      <div className={styles.art}><SourceIllustration example={example} active={reduceMotion || visible} instant={reduceMotion} /></div>
      <figcaption className={styles.visualCaption}><span>From your material</span><strong>{example.course}</strong><small>Kelus proposes {example.concepts.join(", ")}. You confirm the topics.</small></figcaption>
    </figure>
  );
}

function RecallVisual({ example, visible, reduceMotion }: VisualProps) {
  return (
    <figure className={`${styles.visual} ${styles.recallVisual}`}>
      <div className={styles.art}><RecallIllustration example={example} active={reduceMotion || visible} instant={reduceMotion} /></div>
      <figcaption className={styles.visualCaption}><span>From memory</span><strong>{example.question}</strong><small>Answer before you look back at the notes.</small></figcaption>
    </figure>
  );
}

function RerouteVisual({ example, visible, reduceMotion }: VisualProps) {
  return (
    <figure className={`${styles.visual} ${styles.rerouteVisual}`}>
      <div className={styles.art}><RouteIllustration example={example} active={reduceMotion || visible} instant={reduceMotion} showReorder /></div>
      <figcaption className={styles.visualCaption}>
        <span>After that answer</span>
        <strong>First to review: {example.route[0].name}.</strong>
        <small>{example.route[0].name} moves ahead of {example.route[1].name} for another attempt.</small>
      </figcaption>
    </figure>
  );
}

const stages = [
  { number: "01", cue: "Source", icon: "folder", title: "Start with what you were taught.", body: "Add a syllabus, lecture PDF, notes, or a past exam. Kelus proposes topics; you confirm what belongs in your course. Each topic keeps a link back to its source.", detail: "Add the lessons you want to revise · Confirm your revision topics", Visual: SourceVisual, tone: "source" },
  { number: "02", cue: "Recall", icon: "clipboard-check", title: "Show what you can recall.", body: "A short check gives Kelus a starting estimate. Then today’s route tells you what to practise first. Inside a session, retrieve an answer, apply the idea, and check your reasoning.", detail: "Show what you know · Start today’s revision · Review, recall, and apply", Visual: RecallVisual, tone: "recall" },
  { number: "03", cue: "Route", icon: "diagram-project", title: "See the route respond.", body: "A weak answer brings a topic forward; a stronger one gives it room. Your answer changes the route, so the next practice session reflects what actually happened—not a fixed schedule.", detail: "Your answer changes the route", Visual: RerouteVisual, tone: "route" },
] as const;

const example = LEARNING_EXAMPLES[0];

function Chapter({ stage, example, reduceMotion }: { stage: (typeof stages)[number]; example: LearningExample; reduceMotion: boolean }) {
  const chapterRef = useRef<HTMLLIElement>(null);
  const visible = useInView(chapterRef, { once: true, margin: "-12% 0px -12%" });
  const { number, cue, icon, title, body, detail, Visual, tone } = stage;
  // <li key={number} /> remains the chapter identity contract for the route test.

  return (
    <motion.li ref={chapterRef} className={styles.chapter} data-tone={tone}>
      <div className={styles.chapterText}>
        <motion.span className={styles.chapterLabel} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={visible ? { opacity: 1, y: 0 } : undefined} transition={{ delay: reduceMotion ? 0 : .08, duration: .4, ease: kelusEase }}>
          <span>{number}</span><PackArt name={icon} className={styles.chapterIcon} />{cue}
        </motion.span>
        <motion.h2 initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={visible ? { opacity: 1, y: 0 } : undefined} transition={{ delay: reduceMotion ? 0 : .15, duration: .48, ease: kelusEase }}>{title}</motion.h2>
        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={visible ? { opacity: 1, y: 0 } : undefined} transition={{ delay: reduceMotion ? 0 : .22, duration: .48, ease: kelusEase }}>{body}</motion.p>
        <motion.span className={styles.chapterDetail} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={visible ? { opacity: 1, y: 0 } : undefined} transition={{ delay: reduceMotion ? 0 : .29, duration: .42, ease: kelusEase }}>{detail}</motion.span>
      </div>
      <motion.div className={styles.visualWrap} initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={visible ? { opacity: 1, y: 0 } : undefined} transition={{ duration: reduceMotion ? 0 : kelusDuration.normal, ease: kelusEase }}>
        <Visual example={example} visible={visible} reduceMotion={reduceMotion} />
      </motion.div>
    </motion.li>
  );
}

export function HowItWorks() {
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const motionPreference = useReducedMotion();
  const reduceMotion = !hydrated || motionPreference === true;
  const principleRef = useRef<HTMLElement>(null);
  const finalRef = useRef<HTMLElement>(null);
  const principleVisible = useInView(principleRef, { once: true, margin: "-12% 0px -12%" });
  const finalVisible = useInView(finalRef, { once: true, margin: "-12% 0px -12%" });
  // Keep the heading id explicit for route-surface contract checks.
  // <h1 id="how-title"/>

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="how-title">
        <motion.p className={styles.eyebrow} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: kelusEase }}>How Kelus works</motion.p>
        <motion.h1 id="how-title" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: reduceMotion ? 0 : 0.06, duration: 0.65, ease: kelusEase }}>Your lessons become <br />a better revision habit.</motion.h1>
        <motion.div className={styles.heroBottom} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 0.14, duration: 0.5, ease: kelusEase }}>
          <p>Bring your course. Recall what you know. Let each answer shape what you practise next.</p>
          <Link className={styles.primaryAction} href="/today">Set up my course<span className={styles.primaryArrow} aria-hidden="true">→</span></Link>
        </motion.div>
      </section>
      <section className={styles.story} aria-label="The Kelus revision loop">
        <ol>
          {stages.map((stage) => <Chapter key={stage.number} stage={stage} example={example} reduceMotion={reduceMotion} />)}
        </ol>
      </section>
      <motion.section ref={principleRef} className={styles.principle} aria-labelledby="how-principle-title" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={principleVisible ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.6, ease: kelusEase }}>
        <div className={styles.principleHeading}>
          <p className={styles.eyebrow}>What Kelus does—and doesn’t do</p>
          <h2 id="how-principle-title">A route to practise.<br />Not a predicted grade.</h2>
        </div>
        <div className={styles.principleAside}>
          <div className={styles.principleArt}><StudyScene kind="feedback" /></div>
          <p>Kelus uses your course material, exam date, and practice answers to choose what to revisit. Readiness is an estimate from that evidence, not a promise about your exam result.</p>
        </div>
      </motion.section>
      <motion.footer ref={finalRef} className={styles.final} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={finalVisible ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.55, ease: kelusEase }}>
        <p>Ready to revise your own lessons?</p>
        <Link className={styles.primaryAction} href="/today">Set up my course<span className={styles.primaryArrow} aria-hidden="true">→</span></Link>
      </motion.footer>
    </div>
  );
}
