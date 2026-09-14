"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAnimate, useInView, useReducedMotion, type AnimationSequence } from "motion/react";
import styles from "./MarkedScriptHero.module.css";

const route = [
  "M132 238 C116 278 116 315 132 354",
  "M132 354 C148 393 108 429 132 498",
  "M132 498 C156 567 112 568 132 613",
  "M132 613 C152 658 112 647 132 695",
];
const subscribe = () => () => {};

/** Printed content is present before JS. Only the ink is progressively drawn. */
export function ExamRoutePoster() {
  const reduce = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [scope, animate] = useAnimate<HTMLElement>();
  const inView = useInView(scope, { amount: .15 });
  const playback = useRef<ReturnType<typeof animate> | null>(null);
  const [phase, setPhase] = useState<"drawing" | "finished">("drawing");

  useEffect(() => {
    if (reduce !== false) return;
    let active = true;
    // Equal distance/time and matching end/start slopes preserve velocity at joins.
    // Drawing the SVG stroke is the sole non-compositor animation in the hero.
    const lengths = Array.from(scope.current.querySelectorAll<SVGPathElement>("[data-ink]"), path => path.getTotalLength());
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let at = .6;
    const sequence: AnimationSequence = lengths.map((length, i) => {
      const duration = 7.4 * length / total;
      const segment: AnimationSequence[number] = [
        `[data-ink="${i}"]`, { strokeDashoffset: [1, 0] },
        { at, duration, ease: [.3, i === 0 ? 0 : .2, .7, i === lengths.length - 1 ? 1 : .8] },
      ];
      at += duration;
      return segment;
    });
    const arrival = .6 + 7.4 * lengths[0] / total;
    sequence.push(
      ["[data-start-wash]", { opacity: [.16, .18], scaleX: [.94, 1] },
        { at: arrival, type: "spring", bounce: 0, duration: 1 }],
      ["[data-start-note]", { opacity: [.85, 1], y: [2, 0] },
        { at: arrival, type: "spring", bounce: 0, duration: 1 }],
      ["[data-start-wash]", { opacity: .18 }, { at: 8, duration: 2 }],
    );
    const controls = animate(sequence);
    playback.current = controls;
    controls.then(() => { if (active) setPhase("finished"); });
    return () => { active = false; controls.stop(); };
  }, [animate, reduce, scope]);

  useEffect(() => {
    const sync = () => {
      if (phase === "finished") return;
      if (!inView || document.hidden) playback.current?.pause();
      else playback.current?.play();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [inView, phase]);

  return (
    <figure ref={scope} className={styles.script} data-drawing={hydrated && reduce ? "static" : phase}>
      <svg className={styles.art} viewBox="0 0 840 920" role="img" aria-labelledby="script-title script-description">
        <title id="script-title">Marked script → Today’s route</title>
        <desc id="script-description">An illustrative Microeconomics revision script. Supply and demand is checked. A correction to Elasticity marks it as Start here. The ink route continues to Market structures, Externalities, and Game theory.</desc>
        <g transform="rotate(-5 420 445)">
          <path className={styles.paperEdge} d="M69 73 806 65 822 951 76 955Z M73 67 812 60 829 944" />
          <path className={styles.paper} d="M80 51H830V950H80Z" />
          <path className={styles.rule} d="M111 82V915 M137 171H794" />
          <text className={styles.metadata} x="139" y="99">SAMPLE REVISION SCRIPT</text>
          <text className={styles.metadata} x="787" y="99" textAnchor="end">01 / 05</text>
          <text className={styles.scriptTitle} x="137" y="146">Microeconomics</text>
          <path className={styles.rule} d="M778 133h16m-8-8v16" />

          <text className={styles.number} x="139" y="217">01</text>
          <text className={styles.topic} x="181" y="217">Supply &amp; demand</text>
          <text className={styles.answer} x="181" y="249">A change in price moves us along the curve.</text>
          <path className={styles.answerRule} d="M181 263H655 M181 286H746" />
          <path className={styles.pen} d="m709 232 7 8 18-24" />
          <text className={styles.pencilNote} x="536" y="284" transform="rotate(3 536 284)">movement, not a shift</text>

          <text className={styles.number} x="139" y="354">02</text>
          <path data-start-wash="" className={styles.startWash} d="m177 347 176-3 12 11-179 2Z" />
          <text className={styles.startTopic} x="181" y="354">Elasticity</text>
          <text className={styles.question} x="181" y="391">Why do close substitutes change demand?</text>
          <text className={styles.answer} x="181" y="421">More substitutes. A steeper demand curve.</text>
          <path className={styles.pen} d="m316 418 285 5m-279-1 282-8" />
          <path className={styles.answerRule} d="M181 433H682 M181 458H746" />
          <text className={styles.pencilNote} x="374" y="457" transform="rotate(-2 374 457)">more responsive to price.</text>
          <path className={styles.startPen} d="M167 333c39-12 151-14 187 2 25 22-34 42-100 39-73-2-97-17-87-41Z" />
          <g transform="rotate(6 558 335)"><g data-start-note="" className={styles.startAnnotation}>
            <text x="563" y="329">Start here</text>
            <path d="M553 332c-46-2-76 13-123 12m9-6-10 6 9 5" />
          </g></g>
          {route.map((d, i) => <g key={d}>
            <path className={styles.guide} d={d} />
            <path className={styles.routeInk} data-ink={i} d={d} pathLength="1" strokeDashoffset="0" />
          </g>)}
          <circle className={styles.startDot} cx="132" cy="354" r="4" />

          <g transform="translate(0 -50)">
          <text className={styles.number} x="139" y="548">03</text>
          <text className={styles.topic} x="181" y="548">Market structures</text>
          <text className={styles.question} x="181" y="581">Who has the power to set a price?</text>
          <path className={styles.answerRule} d="M181 600H746 M181 623H661" />
          <path className={styles.pen} d="M706 565c18-6 27 2 16 11-5 4-5 5-5 9m-1 8v1" />
          </g>

          <g transform="translate(0 -70)">
          <text className={styles.number} x="139" y="683">04</text>
          <text className={styles.topic} x="181" y="683">Externalities</text>
          <text className={styles.question} x="181" y="716">Which costs are missing from the price?</text>
          <path className={styles.answerRule} d="M181 735H746" />
          </g>

          <g transform="translate(0 -112)">
          <text className={styles.number} x="139" y="807">05</text>
          <text className={styles.topic} x="181" y="807">Game theory</text>
          <text className={styles.question} x="181" y="840">What changes when the other person chooses?</text>
          <path className={styles.answerRule} d="M181 859H746 M181 882H711" />
          </g>
        </g>
      </svg>
    </figure>
  );
}
