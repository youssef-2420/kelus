"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";
import { SourceIllustration, RecallIllustration, RouteIllustration } from "./RevisionObjects";
import styles from "./RevisionLoopVisuals.module.css";

const stages = [
  {
    number: "01",
    title: "Start with your material.",
    description: "Your lecture notes give the question its context.",
    className: styles.source,
    Illustration: SourceIllustration,
  },
  {
    number: "02",
    title: "Try it from memory.",
    description: "An answer shows what you can recall—and what still needs work.",
    className: styles.recall,
    Illustration: RecallIllustration,
  },
  {
    number: "03",
    title: "See the route change.",
    description: "A weak answer brings that topic closer, without guessing a grade.",
    className: styles.route,
    Illustration: RouteIllustration,
  },
] as const;

function RevisionStep({ stage }: { stage: (typeof stages)[number] }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const prefersReducedMotion = useReducedMotion() === true;
  // Keep the server and first client render identical; apply the media preference after hydration.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const reducedMotion = hydrated && prefersReducedMotion;
  const active = reducedMotion || inView;
  const { number, title, description, className, Illustration } = stage;
  const entranceX = number === "02" ? -56 : 56;

  return (
    <article ref={ref} className={`${styles.stage} ${className}`} data-revision-step={number}>
      <div className={styles.caption}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <motion.div
        className={styles.art}
        initial={false}
        animate={{
          opacity: active ? 1 : 0,
          x: active ? 0 : entranceX,
          scale: active ? 1 : 0.94,
        }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.6 }}
      >
        <Illustration active={active} instant={reducedMotion} />
      </motion.div>
    </article>
  );
}

export function RevisionLoopVisuals() {
  return (
    <section className={styles.section} aria-labelledby="revision-loop-title">
      <Reveal className={styles.intro}>
        <h2 id="revision-loop-title">Your notes become the next move.</h2>
        <p>Not another schedule to maintain. A short loop that responds to your work.</p>
      </Reveal>
      <div className={styles.spread}>
        {stages.map((stage) => <RevisionStep key={stage.number} stage={stage} />)}
      </div>
    </section>
  );
}
