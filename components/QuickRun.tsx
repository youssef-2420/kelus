"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { checkPracticeAnswer } from "@/domain/practice-check";
import { explainMatch, looksLikeWords } from "@/domain/answer-evaluation";
import { PackArt } from "@/components/PackArt";
import { whereAnswerBelongs, type QuickRun as Run, type SelfGrade } from "@/domain/quick-run";
import styles from "./QuickRun.module.css";

/** `missed` holds the page lines behind the checks that were wrong or not sure, so the result can point back to them. */
export type QuickRunResult = { right: number; total: number; unsure: number; self: SelfGrade; explained: string; elapsedMs: number; missed: string[] };

const noSubscribe = () => () => {};
const modKeyNow = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl ");

const GRADES: Array<{ value: SelfGrade; label: string; hint: string }> = [
  { value: "nailed", label: "Nailed it", hint: "Same idea, my own words" },
  { value: "partly", label: "Partly", hint: "Some of it" },
  { value: "missed", label: "Missed it", hint: "Not really" },
];

/**
 * One topic as a short run: instant checks that quote the page, then one explanation in your own words.
 * It is the whole loop for a topic: no separate read, use and mark screens.
 */
export function QuickRun({ run, onRevealSource, onFinish, onChecksDone }: {
  run: Run;
  onRevealSource: () => void;
  onFinish: (result: QuickRunResult) => void;
  /** A warm-up is checks only: given this, the last Next ends the run instead of opening the explanation. */
  onChecksDone?: (result: { right: number; total: number; missed: string[] }) => void;
}) {
  const reduce = useReducedMotion() === true;
  const modKey = useSyncExternalStore(noSubscribe, modKeyNow, () => "⌘");
  const started = useRef(0);
  const total = run.checks.length;
  const [step, setStep] = useState(0); // 0..total-1 = checks, total = explain
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [answered, setAnswered] = useState<null | { right: boolean; unsure?: boolean; elsewhere?: string | null; given?: string }>(null);
  const [missed, setMissed] = useState<string[]>([]);
  const [unsure, setUnsure] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [explained, setExplained] = useState("");
  const [compared, setCompared] = useState(false);
  const [nudge, setNudge] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { started.current = performance.now(); }, []);
  useEffect(() => {
    if (!answered) return;
    nextRef.current?.focus();
    nextRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [answered, reduce]);

  const onChecks = step < total;
  const match = compared ? explainMatch(explained, run.explainAnswer, run.topic) : null;
  // Below three key words there is too little to compare fairly, so nothing is highlighted or suggested.
  const useful = match && match.keys >= 3 && explained.trim() ? match : null;
  const item = onChecks ? run.checks[step] : null;

  /** A light tap on phones: a short one when right, a slightly longer one when not. Never on desktop. */
  function feel(ok: boolean) {
    try { if (window.matchMedia("(pointer: coarse)").matches) navigator.vibrate?.(ok ? 8 : [14, 40, 14]); } catch { /* Not supported: fine. */ }
  }

  function answer(value: string | number) {
    if (!item || answered) return;
    const ok = checkPracticeAnswer(item, value);
    if (typeof value === "number") setPicked(value);
    const given = typeof value === "number" ? item.choices?.[value] ?? "" : value.trim();
    setAnswered({ right: ok, given, elsewhere: ok ? null : whereAnswerBelongs(item, given, run.sentences) });
    if (ok) { setRight((count) => count + 1); setStreak((count) => count + 1); } else { setStreak(0); setMissed((list) => [...list, item.sourceQuote]); }
    feel(ok);
  }

  // "Not sure" earns no credit, shows the answer, and does not break a streak: honesty should never cost more than guessing.
  function notSure() {
    if (!item || answered) return;
    setAnswered({ right: false, unsure: true });
    setUnsure((count) => count + 1);
    setMissed((list) => [...list, item.sourceQuote]);
  }

  function next() {
    if (onChecksDone && step + 1 >= total) { onChecksDone({ right, total, missed }); return; }
    setAnswered(null); setPicked(null); setTyped("");
    setStep((current) => current + 1);
  }

  // On a wide screen the notes open beside the comparison. On a phone they would land above it and push it away,
  // and the comparison already quotes the page; "Peek at the notes" in More still opens them.
  function compare() {
    // Key-mashing is neither an answer nor "I don't remember"; ask once, kindly, instead of grading it.
    if (explained.trim() && !looksLikeWords(explained)) { setNudge(true); return; }
    setCompared(true);
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) onRevealSource();
  }

  function finish(self: SelfGrade, at: number) {
    onFinish({ right, total, unsure, self, explained, elapsedMs: Math.max(0, Math.round(at - started.current)), missed });
  }

  // In the explanation: ⌘↵ (Ctrl+Enter) compares; once compared, 1, 2 and 3 pick how close it was.
  useEffect(() => {
    if (item) return;
    const onKey = (event: KeyboardEvent) => {
      if (!compared && event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); compare(); return; }
      if (compared && !event.metaKey && !event.ctrlKey && !event.altKey && /^[123]$/.test(event.key) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault(); finish(GRADES[Number(event.key) - 1].value, event.timeStamp);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, compared, explained]);

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
    // The next card waits for the old one to leave, so leaving is a quick fade: no empty frame in between.
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4, transition: { duration: 0.1 } }, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className={styles.run}>
      <header className={styles.top}>
        <ol className={styles.steps} aria-label={`Step ${Math.min(step + 1, total + (onChecksDone ? 0 : 1))} of ${total + (onChecksDone ? 0 : 1)}`}>
          {[...run.checks, ...(onChecksDone ? [] : [null])].map((_, index) => (
            <li key={index} className={index < step ? styles.done : index === step ? styles.now : undefined} aria-current={index === step ? "step" : undefined} />
          ))}
        </ol>
        {streak >= 2 ? <p className={styles.streak} role="status">{streak} right in a row</p> : <span />}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {item ? (
          <motion.section key={`check-${step}`} className={styles.card} {...motionProps} aria-label={`Check ${step + 1} of ${total}`}>
            <h1 className={styles.prompt}>{item.prompt}</h1>

            {item.kind === "choice" ? (
              <div className={styles.choices} role="group" aria-label="Choose one">
                {item.choices?.map((choice, index) => {
                  const isRight = answered && index === item.correctIndex;
                  const isWrong = answered && !isRight && index === picked;
                  const state = answered ? (isRight ? styles.right : isWrong ? styles.wrong : styles.dim) : "";
                  return (
                    <motion.button
                      key={choice}
                      type="button"
                      className={`${styles.choice} ${state}`}
                      disabled={Boolean(answered)}
                      onClick={() => answer(index)}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: 0.03 + index * 0.03 }}
                      whileTap={reduce || answered ? undefined : { scale: 0.985 }}
                    >
                      {/* The number becomes the verdict in place, so the eye does not have to travel. */}
                      <kbd aria-hidden="true">{isRight ? "✓" : isWrong ? "✕" : index + 1}</kbd>
                      <span>{choice}</span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <motion.form
                className={styles.gap}
                onSubmit={(event) => { event.preventDefault(); if (typed.trim()) answer(typed); }}
                // A wrong word gives a small shake, the way a lock refuses a key; a right one just settles.
                animate={!reduce && answered && !answered.right && !answered.unsure ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <label htmlFor={`run-gap-${step}`} className="sr-only">Your answer, one word</label>
                <span className={styles.field} data-state={answered ? (answered.right ? "right" : answered.unsure ? "unsure" : "wrong") : undefined}>
                  <input id={`run-gap-${step}`} value={typed} onChange={(event) => setTyped(event.target.value)} disabled={Boolean(answered)} autoComplete="off" autoFocus placeholder="One word" />
                  {answered?.right ? <motion.span className={styles.fieldMark} aria-hidden="true" initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 26 }}>✓</motion.span> : null}
                </span>
                {!answered ? <button type="submit" className={`k-btn ${styles.primary}`} disabled={!typed.trim()}>Check<kbd className={styles.key} aria-hidden="true">↵</kbd></button> : null}
              </motion.form>
            )}

            {!answered ? <button type="button" className={styles.unsure} onClick={notSure}>I’m not sure</button> : null}

            {answered ? (
              <motion.div className={`${styles.feedback} ${answered.right ? styles.ok : styles.no}`} role="status" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <strong>{answered.right ? <PackArt name="check" className={styles.mark} /> : null}{answered.unsure ? (item.kind === "cloze" ? `That’s fine. It was “${item.modelAnswer}”.` : "That’s fine. Here’s the answer.") : answered.right ? "Right." : item.kind === "cloze" ? `Not quite. It was “${item.modelAnswer}”.` : "Not quite."}</strong>
                <p className={styles.quote}>“{item.sourceQuote}”</p>
                {answered.elsewhere ? (
                  <div className={styles.elsewhere}>
                    <span>{answered.given && !/\s/.test(answered.given) ? `“${answered.given}” belongs to this line in your notes:` : "That answer belongs to this line in your notes:"}</span>
                    <p>“{answered.elsewhere}”</p>
                  </div>
                ) : null}
                <button ref={nextRef} type="button" className={`k-btn ${styles.primary}`} onClick={next}>{step + 1 >= total ? (onChecksDone ? "See how it went" : "Now say it yourself") : "Next"} <span aria-hidden="true">→</span></button>
              </motion.div>
            ) : null}
          </motion.section>
        ) : (
          <motion.section key="explain" className={styles.card} {...motionProps} aria-label="Explain it">
            <p className={styles.kicker}>Now in your own words</p>
            <h1 className={styles.prompt}>{run.explainPrompt}</h1>
            <label htmlFor="run-explain" className="sr-only">Your explanation</label>
            {!compared ? <textarea id="run-explain" className={styles.area} rows={4} autoFocus value={explained} onChange={(event) => { setExplained(event.target.value); setNudge(false); }} placeholder="Close the page. Write it from memory." /> : null}
            {nudge && !compared ? <p className={styles.nudge} role="alert">That doesn’t look like an answer yet. Write a few words from memory, or tap “I don’t remember”.</p> : null}
            {!compared ? (
              <div className={styles.row}>
                <button type="button" className={`k-btn ${styles.primary}`} onClick={compare}>Compare with the page<kbd className={styles.key} aria-hidden="true">{modKey}↵</kbd></button>
                {!explained.trim() || nudge ? <button type="button" className={styles.link} onClick={() => { setExplained(""); setNudge(false); setCompared(true); }}>I don’t remember</button> : null}
              </div>
            ) : (
              <motion.div className={styles.compare} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <div>
                  <span>Your words</span>
                  <p>{explained.trim() || "Nothing written."}</p>
                </div>
                <div>
                  <span>The page says</span>
                  <p>
                    {useful
                      ? useful.parts.map((part, index) => (part.key ? <mark key={index} className={part.hit ? styles.hit : styles.miss} style={{ animationDelay: `${120 + index * 18}ms` }}>{part.text}</mark> : part.text))
                      : run.explainAnswer}
                  </p>
                </div>
                {useful ? (
                  <p className={styles.coverage} role="status">
                    You used <strong>{useful.hits} of {useful.keys}</strong> key words.
                    {useful.missed.length ? <> Left out: <b>{useful.missed.slice(0, 3).join(", ")}</b>.</> : " Nothing important left out."}
                  </p>
                ) : null}
                <fieldset className={styles.grades}>
                  <legend>How close was it?</legend>
                  {GRADES.map((grade) => (
                    <button key={grade.value} type="button" className={useful?.suggest === grade.value ? styles.suggested : undefined} onClick={(event) => finish(grade.value, event.timeStamp)}>
                      <strong>{grade.label}{useful?.suggest === grade.value ? <em>Suggested</em> : null}</strong>
                      <kbd className={styles.gradeKey} aria-hidden="true">{GRADES.indexOf(grade) + 1}</kbd>
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
