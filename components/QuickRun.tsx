"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { checkPracticeAnswer } from "@/domain/practice-check";
import { PackArt } from "@/components/PackArt";
import type { QuickRun as Run, SelfGrade } from "@/domain/quick-run";
import styles from "./QuickRun.module.css";

export type QuickRunResult = { right: number; total: number; unsure: number; self: SelfGrade; explained: string; elapsedMs: number };

const GRADES: Array<{ value: SelfGrade; label: string; hint: string }> = [
  { value: "nailed", label: "Nailed it", hint: "Same idea, my own words" },
  { value: "partly", label: "Partly", hint: "Some of it" },
  { value: "missed", label: "Missed it", hint: "Not really" },
];

/**
 * One topic as a short run: instant checks that quote the page, then one explanation in your own words.
 * It is the whole loop for a topic: no separate read, use and mark screens.
 */
export function QuickRun({ run, onRevealSource, onFinish }: { run: Run; onRevealSource: () => void; onFinish: (result: QuickRunResult) => void }) {
  const reduce = useReducedMotion() === true;
  const started = useRef(0);
  const total = run.checks.length;
  const [step, setStep] = useState(0); // 0..total-1 = checks, total = explain
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [answered, setAnswered] = useState<null | { right: boolean; unsure?: boolean }>(null);
  const [unsure, setUnsure] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [explained, setExplained] = useState("");
  const [compared, setCompared] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { started.current = performance.now(); }, []);
  useEffect(() => {
    if (!answered) return;
    nextRef.current?.focus();
    nextRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [answered, reduce]);

  const onChecks = step < total;
  const item = onChecks ? run.checks[step] : null;

  function answer(value: string | number) {
    if (!item || answered) return;
    const ok = checkPracticeAnswer(item, value);
    if (typeof value === "number") setPicked(value);
    setAnswered({ right: ok });
    if (ok) { setRight((count) => count + 1); setStreak((count) => count + 1); } else setStreak(0);
  }

  // "Not sure" earns no credit, shows the answer, and does not break a streak: honesty should never cost more than guessing.
  function notSure() {
    if (!item || answered) return;
    setAnswered({ right: false, unsure: true });
    setUnsure((count) => count + 1);
  }

  function next() {
    setAnswered(null); setPicked(null); setTyped("");
    setStep((current) => current + 1);
  }

  function finish(self: SelfGrade, at: number) {
    onFinish({ right, total, unsure, self, explained, elapsedMs: Math.max(0, Math.round(at - started.current)) });
  }

  // 1-4 pick an option, like a quiz.
  useEffect(() => {
    if (!item || item.kind !== "choice" || answered) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < (item.choices?.length ?? 0)) { event.preventDefault(); answer(index); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, answered]);

  const motionProps = reduce
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className={styles.run}>
      <header className={styles.top}>
        <ol className={styles.steps} aria-label={`Step ${Math.min(step + 1, total + 1)} of ${total + 1}`}>
          {[...run.checks, null].map((_, index) => (
            <li key={index} className={index < step ? styles.done : index === step ? styles.now : undefined} aria-current={index === step ? "step" : undefined} />
          ))}
        </ol>
        {streak >= 2 ? <p className={styles.streak} role="status">{streak} right in a row</p> : <span />}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {item ? (
          <motion.section key={`check-${step}`} className={styles.card} {...motionProps} aria-label={`Check ${step + 1} of ${total}`}>
            <p className={styles.kicker}>Check {step + 1} of {total}</p>
            <h1 className={styles.prompt}>{item.prompt}</h1>

            {item.kind === "choice" ? (
              <div className={styles.choices} role="group" aria-label="Choose one">
                {item.choices?.map((choice, index) => {
                  const state = answered ? (index === item.correctIndex ? styles.right : index === picked ? styles.wrong : styles.dim) : "";
                  return (
                    <button key={choice} type="button" className={`${styles.choice} ${state}`} disabled={Boolean(answered)} onClick={() => answer(index)}>
                      <kbd aria-hidden="true">{index + 1}</kbd>
                      <span>{choice}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <form className={styles.gap} onSubmit={(event) => { event.preventDefault(); if (typed.trim()) answer(typed); }}>
                <label htmlFor={`run-gap-${step}`} className="sr-only">Your answer, one word</label>
                <input id={`run-gap-${step}`} value={typed} onChange={(event) => setTyped(event.target.value)} disabled={Boolean(answered)} autoComplete="off" autoFocus placeholder="One word" />
                {!answered ? <button type="submit" className={styles.primary} disabled={!typed.trim()}>Check</button> : null}
              </form>
            )}

            {!answered ? <button type="button" className={styles.unsure} onClick={notSure}>I’m not sure</button> : null}

            {answered ? (
              <motion.div className={`${styles.feedback} ${answered.right ? styles.ok : styles.no}`} role="status" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <strong><PackArt name={answered.right ? "check" : "info"} className={styles.mark} />{answered.unsure ? (item.kind === "cloze" ? `That’s fine. It was “${item.modelAnswer}”.` : "That’s fine. Here’s the answer.") : answered.right ? "Right." : item.kind === "cloze" ? `Not quite. It was “${item.modelAnswer}”.` : "Not quite."}</strong>
                <p className={styles.quote}>“{item.sourceQuote}”</p>
                <button ref={nextRef} type="button" className={styles.primary} onClick={next}>{step + 1 >= total ? "Now say it yourself" : "Next"} <span aria-hidden="true">→</span></button>
              </motion.div>
            ) : null}
          </motion.section>
        ) : (
          <motion.section key="explain" className={styles.card} {...motionProps} aria-label="Explain it">
            <p className={styles.kicker}>Now in your own words</p>
            <h1 className={styles.prompt}>{run.explainPrompt}</h1>
            <label htmlFor="run-explain" className="sr-only">Your explanation</label>
            {!compared ? <textarea id="run-explain" className={styles.area} rows={4} autoFocus value={explained} onChange={(event) => setExplained(event.target.value)} placeholder="Close the page. Write it from memory." /> : null}
            {!compared ? (
              <div className={styles.row}>
                <button type="button" className={styles.primary} onClick={() => { setCompared(true); onRevealSource(); }}>Compare with the page <span aria-hidden="true">→</span></button>
                {!explained.trim() ? <button type="button" className={styles.link} onClick={() => { setCompared(true); onRevealSource(); }}>I don’t remember</button> : null}
              </div>
            ) : (
              <motion.div className={styles.compare} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <div>
                  <span>Your words</span>
                  <p>{explained.trim() || "Nothing written."}</p>
                </div>
                <div>
                  <span>The page says</span>
                  <p>{run.explainAnswer}</p>
                </div>
                <fieldset className={styles.grades}>
                  <legend>How close was it?</legend>
                  {GRADES.map((grade) => (
                    <button key={grade.value} type="button" onClick={(event) => finish(grade.value, event.timeStamp)}>
                      <strong>{grade.label}</strong>
                      <small>{grade.hint}</small>
                    </button>
                  ))}
                </fieldset>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
