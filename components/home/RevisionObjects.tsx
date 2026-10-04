"use client";

import { motion } from "motion/react";
import styles from "./RevisionLoopVisuals.module.css";

type IllustrationProps = { active: boolean; instant: boolean };

const inkMotion = (instant: boolean, delay = 0) =>
  instant ? { duration: 0 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const, delay };

/** Original Kelus drawings: the reference's spare ink and imperfect objects, not its assets. */
export function SourceIllustration({ active, instant }: IllustrationProps) {
  return (
    <svg viewBox="0 0 640 430" className={styles.drawing} aria-hidden="true" focusable="false">
      <path className={styles.ground} d="M66 368c148 8 335 9 507-4" />
      <path className={styles.sketch} d="m88 78 13-15m-1 30-21-5m480 19 15-11m-9 27 23 3" />
      <g transform="rotate(-7 260 201)">
        <path className={styles.backSheet} d="M115 96h298l21 259H132z" />
        <path className={styles.paper} d="M126 77h301l10 268H136z" />
        <path className={styles.paperFold} d="M397 77v34h32" />
        <path className={styles.lightRule} d="M164 135h231M164 157h183M164 182h237M164 206h220M164 230h237M164 254h195M164 278h228" />
        <text x="163" y="118" className={styles.artLabel}>LECTURE 06 / MICROECONOMICS</text>
        <path className={styles.darkRule} d="M164 151h144M164 176h99" />
        <motion.path
          className={styles.sourceMark}
          d="M159 220c38-4 83-3 127-1s68-1 85-3"
          initial={false}
          animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0.7 }}
          style={{ transformOrigin: "159px 220px" }}
          transition={inkMotion(instant, 0.18)}
        />
        <path className={styles.darkRule} d="M164 270h151" />
        <path className={styles.marginNote} d="M367 247c26-3 45-17 51-34m-8 9 8-9 3 13" />
      </g>
      <g transform="rotate(9 450 269)">
        <path className={styles.notePaper} d="M384 184h153v152H384z" />
        <path className={styles.lightRule} d="M405 229h110M405 251h96M405 273h110M405 295h72" />
        <text x="405" y="215" className={styles.artLabel}>SOURCE / PAGE 3</text>
        <path className={styles.sourceMark} d="M405 281c34-3 72-3 94-2" />
      </g>
      <path className={styles.clip} d="M289 59v-16c0-13 23-13 23 0v39c0 17-30 18-30 0V47" />
      <path className={styles.sketch} d="m528 343 13-6m-3 15 14 2" />
    </svg>
  );
}

export function RecallIllustration({ active, instant }: IllustrationProps) {
  return (
    <svg viewBox="0 0 640 430" className={styles.drawing} aria-hidden="true" focusable="false">
      <path className={styles.ground} d="M68 362c145 11 350 10 507-2" />
      <path className={styles.sketch} d="m94 102-22-7m34-13-11-18m453 3 13-13m-2 34 24-7" />
      <g transform="rotate(-8 250 202)">
        <path className={styles.backSheet} d="M109 91h296v238H109z" />
        <path className={styles.lightRule} d="M136 158h242M136 187h242M136 216h242M136 245h242M136 274h242" />
      </g>
      <g transform="rotate(4 322 220)">
        <path className={styles.paper} d="M153 91h326v253H153z" />
        <path className={styles.lightRule} d="M183 199h264M183 242h264M183 285h264M183 326h264" />
        <text x="182" y="132" className={styles.artLabel}>CLOSE THE NOTES / TRY FROM MEMORY</text>
        <text x="182" y="171" className={styles.artQuestion}>Why do substitutes</text>
        <text x="182" y="194" className={styles.artQuestion}>change demand?</text>
        <motion.path
          className={styles.recallMark}
          d="M185 232c61-7 115-8 174-4"
          initial={false}
          animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0.65 }}
          style={{ transformOrigin: "185px 232px" }}
          transition={inkMotion(instant, 0.22)}
        />
        <motion.path
          className={styles.pencilWriting}
          d="M189 270c23-8 31 9 49 0 15-8 27-8 42 1 18 11 36-9 50-2"
          initial={false}
          animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0.4 }}
          style={{ transformOrigin: "189px 270px" }}
          transition={inkMotion(instant, 0.33)}
        />
      </g>
      <g transform="rotate(32 502 249)">
        <path className={styles.pencilBody} d="M493 155h19v173h-19z" />
        <path className={styles.pencilTip} d="m493 328 9 32 10-32z" />
        <path className={styles.pencilLine} d="M500 165v151m5-151v151" />
        <path className={styles.pencilEraser} d="M493 155v-21c0-6 19-6 19 0v21" />
      </g>
      <path className={styles.sketch} d="m122 343 15 12m-5-17 16 4" />
    </svg>
  );
}

export function RouteIllustration({ active, instant }: IllustrationProps) {
  return (
    <svg viewBox="0 0 640 430" className={styles.drawing} aria-hidden="true" focusable="false">
      <path className={styles.ground} d="M67 366c163 8 361 7 504-3" />
      <path className={styles.sketch} d="m110 90-15-11m1 29-22 4m451-52 16-11m-5 31 22 5" />
      <g transform="rotate(-3 313 217)">
        <path className={styles.backSheet} d="M132 72h385v286H132z" />
        <path className={styles.paper} d="M117 70h385v278H117z" />
        <path className={styles.notebookSpine} d="M145 70v278" />
        <path className={styles.notebookRing} d="M136 103c-19 0-19 15 0 15h22m-22 46c-19 0-19 15 0 15h22m-22 46c-19 0-19 15 0 15h22m-22 46c-19 0-19 15 0 15h22" />
        <text x="177" y="111" className={styles.artLabel}>TODAY / AFTER YOUR ANSWER</text>
        <path className={styles.lightRule} d="M177 128h294M177 201h294M177 269h294" />
        <text x="179" y="171" className={styles.artNumber}>01</text>
        <text x="229" y="170" className={styles.artRouteTitle}>Elasticity</text>
        <text x="229" y="190" className={styles.artDetail}>Try again while it is fresh</text>
        <text x="179" y="241" className={styles.artNumber}>02</text>
        <text x="229" y="239" className={styles.artRouteQuiet}>Supply &amp; demand</text>
        <text x="229" y="258" className={styles.artDetail}>Review next</text>
        <text x="179" y="308" className={styles.artNumber}>03</text>
        <text x="229" y="306" className={styles.artRouteQuiet}>Market structures</text>
        <motion.path
          className={styles.routeMark}
          d="M226 178c39 4 88 2 130-2"
          initial={false}
          animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0.5 }}
          style={{ transformOrigin: "226px 178px" }}
          transition={inkMotion(instant, 0.2)}
        />
        <motion.path
          className={styles.routeArrow}
          d="M452 254c35-15 39-50 26-78m-1 14 1-15 11 10"
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 9 }}
          transition={inkMotion(instant, 0.3)}
        />
      </g>
      <path className={styles.sketch} d="m508 342 16 2m-6 8 15 8" />
    </svg>
  );
}
