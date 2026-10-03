"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";
import styles from "./RevisionLoopVisuals.module.css";

type IllustrationProps = { active: boolean; instant: boolean };

const settle = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
const timing = (instant: boolean, delay = 0) => instant ? { duration: 0 } : { ...settle, delay };

function SourceIllustration({ active, instant }: IllustrationProps) {
  return (
    <svg viewBox="0 0 360 248" aria-hidden="true" focusable="false" className={styles.drawing}>
      <path className={styles.looseLine} d="M24 187c42-11 58 2 86 3" />
      <motion.g initial={false} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 9 }} transition={timing(instant)}>
        <g transform="rotate(-4 176 122)">
          <rect x="48" y="22" width="264" height="207" rx="3" className={styles.sheet} />
          <path d="M69 58h221M69 91h221M69 124h221M69 157h221M69 190h221" className={styles.rule} />
          <text x="69" y="47" className={styles.miniLabel}>LECTURE 06 · MICROECONOMICS</text>
          <text x="69" y="82" className={styles.sheetTitle}>Demand &amp; substitutes</text>
          <path d="M69 105h154" className={styles.inkLine} />
          <path d="M69 115h108" className={styles.inkLine} />
          <motion.path d="M71 169h77" className={styles.sourceUnderline} initial={false} animate={{ opacity: active ? 0.22 : 0, scaleX: active ? 1 : 0 }} style={{ transformOrigin: "71px 169px" }} transition={timing(instant, active ? 0.22 : 0)} />
          <text x="71" y="183" className={styles.note}>close substitutes</text>
          <path d="M190 177h82M190 177v-59M201 130l60 40" className={styles.graph} />
          <circle cx="244" cy="159" r="3" className={styles.graphDot} />
        </g>
      </motion.g>
      <path d="M252 218c27 5 56-1 80-15" className={styles.looseLine} />
    </svg>
  );
}

function RecallIllustration({ active, instant }: IllustrationProps) {
  return (
    <svg viewBox="0 0 360 248" aria-hidden="true" focusable="false" className={styles.drawing}>
      <path className={styles.looseLine} d="M15 54c34-22 60-18 78-7" />
      <rect x="35" y="36" width="290" height="181" rx="3" className={styles.sheet} />
      <text x="59" y="65" className={styles.miniLabel}>RECALL · WITHOUT LOOKING</text>
      <text x="59" y="97" className={styles.prompt}>Why do close substitutes</text>
      <text x="59" y="120" className={styles.prompt}>change demand?</text>
      <path d="M59 141h243M59 171h243M59 201h243" className={styles.rule} />
      <motion.text x="59" y="163" className={styles.answer} initial={false} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 5 }} transition={timing(instant)}>People can choose another option.</motion.text>
      <motion.path d="M68 181c54 7 112 5 150-1" className={styles.correction} initial={false} animate={{ opacity: active ? 0.75 : 0, scaleX: active ? 1 : 0 }} style={{ transformOrigin: "68px 181px" }} transition={timing(instant, active ? 0.22 : 0)} />
      <motion.path d="m241 151 10 8 19-23" className={styles.check} initial={false} animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.8 }} style={{ transformOrigin: "251px 151px" }} transition={timing(instant, active ? 0.38 : 0)} />
      <path d="M288 16c16 11 26 25 27 43" className={styles.looseLine} />
    </svg>
  );
}

function RouteIllustration({ active, instant }: IllustrationProps) {
  return (
    <svg viewBox="0 0 360 248" aria-hidden="true" focusable="false" className={styles.drawing}>
      <rect x="36" y="30" width="288" height="187" rx="3" className={styles.sheet} />
      <text x="60" y="59" className={styles.miniLabel}>TODAY’S ROUTE · AFTER THAT ANSWER</text>
      <path d="M60 73h240" className={styles.rule} />
      <path d="M71 89v95" className={styles.routeLine} />
      <motion.circle cx="71" cy="110" r="5" className={styles.routeDot} initial={false} animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.5 }} style={{ transformOrigin: "71px 110px" }} transition={timing(instant)} />
      <circle cx="71" cy="165" r="4" className={styles.routeDotQuiet} />
      <text x="92" y="106" className={styles.routeNumber}>01</text>
      <motion.g initial={false} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }} transition={timing(instant)}>
        <text x="122" y="108" className={styles.routeTitle}>Elasticity</text>
        <text x="122" y="129" className={styles.routeReason}>Needs another attempt</text>
      </motion.g>
      <motion.path d="M121 139h169" className={styles.routeUnderline} initial={false} animate={{ opacity: active ? 0.22 : 0, scaleX: active ? 1 : 0 }} style={{ transformOrigin: "121px 139px" }} transition={timing(instant, active ? 0.22 : 0)} />
      <text x="92" y="164" className={styles.routeNumber}>02</text>
      <text x="122" y="166" className={styles.routeTitleQuiet}>Supply &amp; demand</text>
      <text x="122" y="187" className={styles.routeReason}>Review after Elasticity</text>
      <path d="M24 201c-2-44-1-78 10-94" className={styles.looseLine} />
      <path d="m25 110 9-7 5 12" className={styles.looseLine} />
    </svg>
  );
}

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
  const reducedMotion = useReducedMotion() === true;
  const active = reducedMotion || inView;
  const { number, title, description, className, Illustration } = stage;

  return (
    <article ref={ref} className={`${styles.stage} ${className}`} data-revision-step={number}>
      <div className={styles.caption}>
        <span className={styles.number}>{number} / 03</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className={styles.art}>
        <Illustration active={active} instant={reducedMotion} />
      </div>
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
      <p className={styles.disclaimer}>Illustrative Microeconomics example. Your route uses your own material and answers.</p>
    </section>
  );
}
