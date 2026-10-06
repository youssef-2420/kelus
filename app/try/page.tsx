"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { QuickRun, type QuickRunResult } from "@/components/QuickRun";
import { quickOutcome } from "@/domain/quick-run";
import { SAMPLE_LOCATOR, SAMPLE_NAME, buildSampleRun } from "@/data/try-sample";
import styles from "./try.module.css";

const VERDICT = {
  success: { title: "That one’s yours.", body: "You checked it and said it in your own words. Kelus would bring this back later, not tomorrow." },
  partial: { title: "Nearly there.", body: "Part of it stuck. Kelus would bring it back sooner, with a different question." },
  failure: { title: "Not yet, and that’s useful.", body: "Now you know what to read again. Kelus would bring it back soon." },
} as const;

export default function TryPage() {
  const reduce = useReducedMotion() === true;
  const [round, setRound] = useState(0);
  const run = useMemo(() => buildSampleRun(round), [round]);
  const [result, setResult] = useState<QuickRunResult | null>(null);

  if (!run) return null;
  const outcome = result ? quickOutcome(result) : null;
  const verdict = outcome ? VERDICT[outcome] : null;

  return (
    <main id="main" className={styles.page}>
      <header className={styles.head}>
        <p className={styles.where}>Sample · {SAMPLE_NAME} · {SAMPLE_LOCATOR}</p>
      </header>

      {!result ? (
        <QuickRun key={round} run={run} onRevealSource={() => undefined} onFinish={setResult} />
      ) : verdict ? (
        <motion.section className={styles.done} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} aria-label="Result">
          <p className={styles.score}><strong>{result.right}</strong> of {result.total} checks right</p>
          <h1>{verdict.title}</h1>
          <p>{verdict.body}</p>
          <div className={styles.actions}>
            <Link href="/today" className={styles.primary}>Do this with my own notes <span aria-hidden="true">→</span></Link>
            <button type="button" className={styles.link} onClick={() => { setResult(null); setRound((value) => value + 1); }}>Try the sample again</button>
          </div>
          <p className={styles.fine}>Your notes stay on this device. You review every topic Kelus finds before it shapes your plan.</p>
        </motion.section>
      ) : null}
    </main>
  );
}
