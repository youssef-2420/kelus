"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";
import styles from "./HomeVisualChapters.module.css";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

const orbitSlots = [
  { x: "0%", y: -14, rotate: 0, scale: 1, opacity: 1 },
  { x: "72%", y: 28, rotate: 8, scale: 0.78, opacity: 0.92 },
  { x: "-72%", y: 28, rotate: -8, scale: 0.78, opacity: 0.92 },
] as const;

function RevisionPaper({ kind }: { kind: "source" | "recall" | "route" }) {
  if (kind === "source") return (
    <div className={`${styles.paper} ${styles.sourcePaper}`}>
      <span className={styles.paperTop}>LECTURE NOTES · MICROECONOMICS</span>
      <strong>Demand &amp;<br />substitutes</strong>
      <span className={styles.paperRule} />
      <span className={styles.paperRuleShort} />
      <span className={styles.sourceUnderline}>close substitutes</span>
      <span className={styles.paperRule} />
    </div>
  );
  if (kind === "recall") return (
    <div className={`${styles.paper} ${styles.recallPaper}`}>
      <span className={styles.paperTop}>WITHOUT LOOKING</span>
      <strong>Why do substitutes<br />change demand?</strong>
      <span className={styles.paperRule} />
      <span className={styles.recallAnswer}>People can choose another option.</span>
      <span className={styles.recallUnderline} />
      <span className={styles.paperRuleShort} />
    </div>
  );
  return (
    <div className={`${styles.paper} ${styles.routePaper}`}>
      <span className={styles.paperTop}>TODAY · AFTER THAT ANSWER</span>
      <strong>Next pass</strong>
      <span className={styles.routeRow}><span>01</span><span>Elasticity</span></span>
      <span className={styles.routeNote}>Needs another attempt</span>
      <span className={styles.routeRow}><span>02</span><span>Supply &amp; demand</span></span>
    </div>
  );
}

function ReturnIllustration() {
  return (
    <svg className={styles.returnDrawing} viewBox="0 0 760 440" aria-hidden="true" focusable="false">
      <path className={styles.guide} d="M30 333C178 393 256 265 371 282s181 94 357-63" />
      <path className={styles.arrow} d="m714 219 16-4-6 16" />
      <g transform="rotate(-7 228 213)">
        <rect className={styles.whitePaper} x="74" y="64" width="336" height="302" rx="3" />
        <path className={styles.paperRule} d="M99 126h286M99 177h286M99 228h286M99 279h286M99 330h286" />
        <text className={styles.paperLabel} x="100" y="107">FIRST PASS · FROM YOUR NOTES</text>
        <text className={styles.paperTitle} x="100" y="161">Elasticity</text>
        <text className={styles.paperBody} x="100" y="208">Why do substitutes matter?</text>
        <path className={styles.thinkingLine} d="M101 248c48-4 77-2 125 0m-125 52c79-3 133 0 186 0" />
        <path className={styles.coralMark} d="m286 234 30 32m-3-36-25 37" />
      </g>
      <g transform="rotate(5 532 206)">
        <rect className={styles.yellowPaper} x="376" y="70" width="290" height="284" rx="3" />
        <text className={styles.paperLabel} x="405" y="109">NEXT TIME · ONE MORE RECALL</text>
        <text className={styles.paperTitle} x="405" y="155">Try it again.</text>
        <path className={styles.greenRule} d="M405 178h222" />
        <text className={styles.paperBody} x="405" y="216">A weak answer brings this</text>
        <text className={styles.paperBody} x="405" y="240">topic back into the route.</text>
        <path className={styles.greenUnderline} d="M405 266c58 5 111 5 165 0" />
        <path className={styles.greenRule} d="M405 308h222" />
      </g>
      <path className={styles.coralRoute} d="M319 88c45-37 89-26 117 12" />
      <path className={styles.coralRoute} d="m421 94 19 11-2-22" />
      <circle className={styles.coralDot} cx="62" cy="81" r="8" />
      <circle className={styles.greenDot} cx="681" cy="362" r="5" />
    </svg>
  );
}

export function StudyMoment() {
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.35 });
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const motionPreference = useReducedMotion();
  const reducedMotion = !hydrated || motionPreference === true;
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  const [phase, setPhase] = useState(0);
  const shownPhase = reducedMotion ? 2 : phase;

  useEffect(() => {
    if (!inView || !pageVisible || reducedMotion || phase >= 2) return;
    const timer = window.setTimeout(() => setPhase((current) => current + 1), phase === 0 ? 950 : 1500);
    return () => window.clearTimeout(timer);
  }, [inView, pageVisible, phase, reducedMotion]);

  return (
    <section className={styles.studySection} aria-labelledby="study-moment-title">
      <div className={styles.studyInner}>
        <div ref={stageRef} className={styles.studyArt} data-study-loop data-phase={shownPhase}>
          <p className="sr-only">Animated study papers show a lecture note becoming a recall answer, then a revised next pass.</p>
          <div className={styles.orbitGuide} aria-hidden="true" />
          {(["source", "recall", "route"] as const).map((kind, index) => {
            const slot = (index - shownPhase + 3) % 3;
            return (
              <div className={styles.paperAnchor} key={kind} aria-hidden="true">
                <motion.div
                  className={styles.orbitPaper}
                  data-paper={kind}
                  initial={false}
                  animate={orbitSlots[slot]}
                  transition={reducedMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.7 }}
                  style={{ zIndex: slot === 0 ? 2 : 1 }}
                >
                  <RevisionPaper kind={kind} />
                </motion.div>
              </div>
            );
          })}
          <div className={styles.sceneControls}>
            <span className={styles.sceneLabel}>A study pass, in motion</span>
            {!reducedMotion && <button className={styles.replayButton} type="button" aria-label="Replay study animation" onClick={() => setPhase(0)} disabled={phase < 2}>
              Replay <span aria-hidden="true">↺</span>
            </button>}
          </div>
        </div>
        <Reveal className={styles.studyCopy}>
          <h2 id="study-moment-title">The studying happens here.</h2>
          <p>Your own notes stay close while you answer, check, and decide what deserves another pass. One focused session, not more tabs to manage.</p>
          <Link href="/today" className={styles.textLink}>Set up my course <span aria-hidden="true">↗</span></Link>
        </Reveal>
      </div>
    </section>
  );
}

export function RevisionReturn() {
  return (
    <section className={styles.returnSection} aria-labelledby="revision-return-title">
      <div className={styles.returnInner}>
        <Reveal className={styles.returnCopy}>
          <h2 id="revision-return-title">One answer doesn’t end the story.</h2>
          <p>When recall is shaky, Kelus keeps the topic in view. Your next route reflects what needs another pass.</p>
        </Reveal>
        <Reveal className={styles.returnArt}>
          <ReturnIllustration />
        </Reveal>
      </div>
    </section>
  );
}
