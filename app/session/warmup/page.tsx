"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { PackArt } from "@/components/PackArt";
import { QuickRun } from "@/components/QuickRun";
import { returnVisit, warmupChecks } from "@/domain/return-visit";
import type { QuickRun as Run } from "@/domain/quick-run";
import { getMissedLines, getServerMissedLines, resolveMissedLines, subscribeMissedLines } from "@/lib/missed-lines";
import { KelusLogoMark } from "@/components/KelusLogoMark";
import { useEffect } from "react";
import styles from "./warmup.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The first minute of a return visit: the lines you missed last time, asked again from the same sentences.
 * Right answers leave the list; the rest wait for next time. Then straight on to the next topic.
 */
function WarmUp() {
  const router = useRouter();
  const params = useSearchParams();
  const nextName = params.get("next");
  const reduce = useReducedMotion() === true;
  const { state } = useLearner();
  const missed = useSyncExternalStore(subscribeMissedLines, getMissedLines, getServerMissedLines);
  const names = useMemo(() => new Map(state.snapshot.concepts.map((concept) => [concept.id, concept.name])), [state.snapshot.concepts]);
  // Fixed when the page opens: answering must not reshuffle the run underneath the student.
  const [plan] = useState(() => warmupChecks(returnVisit({ events: state.snapshot.events, names, missed, nowMs: Date.parse(state.nowIso) }).warmup));
  const [result, setResult] = useState<{ right: number; total: number; back: string[]; still: string[] } | null>(null);

  const run: Run = useMemo(() => ({
    checks: plan.map((entry) => entry.item),
    explainPrompt: "",
    explainAnswer: "",
    explainQuote: "",
    sentences: plan.map((entry) => entry.line.quote),
    topic: "",
  }), [plan]);

  function done(outcome: { right: number; total: number; missed: string[] }) {
    const still = new Set(outcome.missed);
    const back = plan.map((entry) => entry.line.quote).filter((quote) => !still.has(quote));
    resolveMissedLines(back);
    setResult({ right: outcome.right, total: outcome.total, back, still: [...still] });
  }

  function continueOn() {
    try { window.sessionStorage.setItem("kelus-start-first-run", "1"); } catch { /* Today still shows the next topic. */ }
    router.push("/today");
  }

  if (!plan.length && !result) {
    return (
      <section className={styles.empty}>
        <PackArt name="award" className={styles.emptyIcon} size={40} />
        <h1>Nothing to warm up on.</h1>
        <p>Every line you missed has come back, or it is still too fresh to ask again.</p>
        <Link href="/today" className={`k-btn ${styles.primary}`}>Back to Today <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <>
      {!result ? (
        <div className={styles.runWrap}>
          <h1 className={styles.heading}>Warm up on what you missed</h1>
          <p className={styles.sub}>{plan.length === 1 ? "One line" : `${plan.length} lines`} from last time, about a minute.</p>
          <QuickRun run={run} onRevealSource={() => undefined} onFinish={() => undefined} onChecksDone={done} />
        </div>
      ) : (
        <motion.section
          key="done"
          className={styles.done}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduce ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5 }}
          aria-labelledby="warmup-done-title"
        >
          <PackArt name={result.right === result.total ? "growing" : "time-flies"} className={styles.art} size={180} />
          <h1 id="warmup-done-title">
            {result.right === result.total ? "All of it came back." : result.right === 0 ? "Not yet. That’s what warm-ups are for." : `${result.right} of ${result.total} came back.`}
          </h1>
          <p className={styles.line}>
            {result.back.length ? "The lines you got are off your list. " : ""}
            {result.still.length ? (result.back.length ? (result.still.length === 1 ? "The other one comes back next time." : "The others come back next time.") : result.still.length === 1 ? "It comes back next time, once it has had a rest." : "They come back next time, once they have had a rest.") : ""}
          </p>
          <ul className={styles.lines}>
            {plan.map((entry, index) => {
              const back = result.back.includes(entry.line.quote);
              return (
                <motion.li
                  key={entry.line.quote}
                  className={back ? styles.back : styles.still}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.35, delay: 0.25 + index * 0.08, ease }}
                >
                  <span className={styles.mark} aria-hidden="true">{back ? "✓" : "↻"}</span>
                  <span>
                    <b>{entry.line.name}</b>
                    <q>{entry.line.quote}</q>
                    <span className="sr-only">{back ? "Came back" : "Comes back next time"}</span>
                  </span>
                </motion.li>
              );
            })}
          </ul>
          <div className={styles.actions}>
            <motion.button type="button" className={`k-btn ${styles.primary}`} onClick={continueOn} whileTap={reduce ? undefined : { scale: 0.97 }}>
              {nextName ? `Continue to ${nextName}` : "Continue to your next topic"} <span aria-hidden="true">→</span>
            </motion.button>
            <Link href="/today" className={`k-btn k-btn--paper ${styles.secondary}`}>Back to Today</Link>
          </div>
        </motion.section>
      )}
    </>
  );
}

function WarmUpShell({ children }: { children: React.ReactNode }) {
  // Same page as a session: its bar, its body classes, so its type and colours.
  useEffect(() => {
    document.body.classList.add("is-session-booklet", "is-warmup");
    return () => document.body.classList.remove("is-session-booklet", "is-warmup");
  }, []);
  return (
    <>
      <header className={styles.bar}>
        <Link href="/" className="study-brand" aria-label="Kelus home"><KelusLogoMark /><span>kelus</span></Link>
        <Link href="/today" className={styles.close}>Close</Link>
      </header>
      {children}
    </>
  );
}

export default function WarmUpPage() {
  return (
    <WarmUpShell>
    <main id="main" className={styles.page}>
      <Suspense fallback={null}>
        <WarmUp />
      </Suspense>
    </main>
    </WarmUpShell>
  );
}
