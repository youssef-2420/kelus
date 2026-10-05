"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { checkPracticeAnswer, isDrillable } from "@/domain/practice-check";
import type { PracticeItem } from "@/domain/types";
import styles from "./PracticeDrill.module.css";

/**
 * A few quick questions from the topic's own page, checked instantly. Each answer shows the page's words.
 * This is practice, not evidence: it does not change the learner model.
 */
export function PracticeDrill({ items }: { items: PracticeItem[] }) {
  const reduce = useReducedMotion() === true;
  const drill = items.filter(isDrillable).slice(0, 4);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<null | { right: boolean }>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);

  useEffect(() => { if (result) feedback.current?.focus(); }, [result]);

  if (drill.length < 2) return null;
  const item = drill[index];

  function answer(value: string | number) {
    if (result) return;
    const right = checkPracticeAnswer(item, value);
    setResult({ right });
    if (right) setScore((current) => current + 1);
  }

  function next() {
    if (index + 1 >= drill.length) { setDone(true); return; }
    setIndex(index + 1); setTyped(""); setResult(null);
  }

  if (!open) {
    return (
      <section className={styles.card} aria-label="Quick practice">
        <div>
          <strong>Lock it in</strong>
          <p>{drill.length} quick questions from this page. About a minute.</p>
        </div>
        <button type="button" className={styles.start} onClick={() => setOpen(true)}>Practice now</button>
      </section>
    );
  }

  if (done) {
    return (
      <section className={styles.card} aria-label="Quick practice" role="status">
        <div>
          <strong>{score} of {drill.length} right</strong>
          <p>{score === drill.length ? "Everything on the page, from memory." : "The page explains each one above. Come back to the ones you missed."}</p>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className={`${styles.card} ${styles.open}`}
      aria-label="Quick practice"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3 }}
    >
      <p className={styles.count}>Question {index + 1} of {drill.length}</p>
      <p className={styles.prompt}>{item.prompt}</p>

      {item.kind === "choice" ? (
        <div className={styles.choices} role="group" aria-label="Choose one">
          {item.choices?.map((choice, choiceIndex) => (
            <button
              key={choice}
              type="button"
              disabled={Boolean(result)}
              className={result ? (choiceIndex === item.correctIndex ? styles.right : styles.dim) : undefined}
              onClick={() => answer(choiceIndex)}
            >
              {choice}
            </button>
          ))}
        </div>
      ) : (
        <form className={styles.gap} onSubmit={(event) => { event.preventDefault(); if (typed.trim()) answer(typed); }}>
          <label htmlFor={`gap-${item.id}`} className="sr-only">Your answer</label>
          <input id={`gap-${item.id}`} value={typed} onChange={(event) => setTyped(event.target.value)} disabled={Boolean(result)} autoComplete="off" autoFocus placeholder="One word" />
          {!result ? <button type="submit" className={styles.start} disabled={!typed.trim()}>Check</button> : null}
        </form>
      )}

      {result ? (
        <div ref={feedback} tabIndex={-1} className={`${styles.feedback} ${result.right ? styles.ok : styles.no}`} role="status">
          <strong>{result.right ? "Right." : item.kind === "cloze" ? `Not quite. It was “${item.modelAnswer}”.` : "Not quite."}</strong>
          <p>{item.explanation}</p>
          <button type="button" className={styles.start} onClick={next}>{index + 1 >= drill.length ? "Finish" : "Next"}</button>
        </div>
      ) : null}
    </motion.section>
  );
}
