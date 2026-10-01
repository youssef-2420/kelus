"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion";
import styles from "./HomeVisualChapters.module.css";

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
  return (
    <section className={styles.studySection} aria-labelledby="study-moment-title">
      <div className={styles.studyInner}>
        <Reveal className={styles.studyArt}>
          <span className={styles.studyOrbit} aria-hidden="true" />
          <Image
            src="/hero/student.webp"
            alt="Illustration of a student writing in an open notebook"
            width={1200}
            height={1050}
            sizes="(max-width: 760px) 100vw, 52vw"
            className={styles.studentImage}
          />
        </Reveal>
        <Reveal className={styles.studyCopy}>
          <h2 id="study-moment-title">The studying happens here.</h2>
          <p>The note, the question, your answer, and the next step stay in one place. Open the sample below and try a pass for yourself.</p>
          <a href="#try" className={styles.textLink}>Try the sample <span aria-hidden="true">↗</span></a>
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
          <p className={styles.exampleNote}>Illustrative route change, not a predicted grade.</p>
        </Reveal>
        <Reveal className={styles.returnArt}>
          <ReturnIllustration />
        </Reveal>
      </div>
    </section>
  );
}
