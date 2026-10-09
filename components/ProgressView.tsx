"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { progressHeadline, progressSummary, type TopicChange } from "@/domain/progress";
import type { Concept, LearningEvent } from "@/domain/types";
import styles from "./ProgressView.module.css";

const pct = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);

function Trend({ series, target }: { series: Array<{ label: string; readiness: number; answered: number }>; target: number | null }) {
  const width = 560;
  const height = 150;
  const pad = { left: 8, right: 8, top: 10, bottom: 22 };
  const x = (index: number) => pad.left + (index / (series.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - Math.max(0, Math.min(1, value))) * (height - pad.top - pad.bottom);
  const line = series.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.readiness).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const last = series[series.length - 1];
  const first = series[0];
  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Estimated readiness over 14 days: from ${pct(first.readiness)}% to ${pct(last.readiness)}%${target === null ? "" : `, aiming for ${target}%`}.`}>
      {target === null ? null : (
        <>
          <line x1={pad.left} x2={width - pad.right} y1={y(target / 100)} y2={y(target / 100)} className={styles.target} />
          <text x={width - pad.right} y={y(target / 100) - 5} textAnchor="end" className={styles.targetLabel}>Your target {target}%</text>
        </>
      )}
      <path d={area} className={styles.area} />
      <path d={line} className={styles.line} />
      {series.map((point, index) => (point.answered > 0 ? <circle key={point.label} cx={x(index)} cy={y(point.readiness)} r={3.2} className={styles.dot} /> : null))}
      <circle cx={x(series.length - 1)} cy={y(last.readiness)} r={5} className={styles.now} />
      <text x={pad.left} y={height - 5} className={styles.axis}>{first.label}</text>
      <text x={width - pad.right} y={height - 5} textAnchor="end" className={styles.axis}>Today</text>
    </svg>
  );
}

const LAST: Record<string, string> = { success: "Last answer: solid", partial: "Last answer: partly there", failure: "Last answer: missed" };

function Topics({ title, note, items, empty }: { title: string; note: string; items: TopicChange[]; empty: string }) {
  return (
    <section className={styles.group} aria-label={title}>
      <h3>{title}</h3>
      <p className={styles.note}>{note}</p>
      {items.length ? (
        <ul>
          {items.slice(0, 6).map((topic) => (
            <li key={topic.id}>
              <strong>{topic.name}</strong>
              <span className={styles.move} aria-label={`${pct(topic.before)} percent to ${pct(topic.after)} percent`}>
                {/* A change is shown as a change; "0% → 0%" says nothing, so the last answer is named instead. */}
                {topic.attempts === 0 ? "Not started" : pct(topic.before) !== pct(topic.after) ? <>{pct(topic.before)}% <span aria-hidden="true">→</span> {pct(topic.after)}%</> : LAST[topic.lastOutcome ?? "partial"]}
              </span>
              <span className={styles.bar} aria-hidden="true"><i style={{ width: `${pct(topic.after)}%` }} /></span>
            </li>
          ))}
        </ul>
      ) : <p className={styles.empty}>{empty}</p>}
    </section>
  );
}

/** What changed, from your own answers. Honest first: too little data says so instead of drawing a trend. */
export function ProgressView({ concepts, events, nowIso, daysToExam, targetPercent, examDatePending = false }: { concepts: Concept[]; events: LearningEvent[]; nowIso: string; daysToExam: number; targetPercent: number; examDatePending?: boolean }) {
  const reduce = useReducedMotion() === true;
  const summary = progressSummary({ concepts, events, nowMs: Date.parse(nowIso), daysToExam });
  const target = Math.round(Math.max(0, Math.min(100, targetPercent)));
  const gap = target - pct(summary.readinessNow);
  // Before the first answer there is nothing to compare, so the page is one card and the list of topics to start.
  const fresh = summary.answers === 0;

  return (
    <div className={styles.page}>
      <motion.section className={styles.lead} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }} aria-labelledby="progress-headline">
        <h2 id="progress-headline">{progressHeadline(summary)}</h2>
        <p className={styles.caveat}>{fresh ? "Nothing is estimated until you answer. When it is, it comes from your own answers, not a prediction of your grade." : "Estimated from your own answers. It is not a prediction of your grade."}</p>
        {fresh ? null : summary.enough ? (
          <Trend series={summary.series} target={examDatePending ? null : target} />
        ) : (
          <div className={styles.thinRow}>
            <p className={styles.thin}>{summary.answers} answer{summary.answers === 1 ? "" : "s"} so far. Kelus draws a trend once there are 6, so it never guesses from a few.</p>
          </div>
        )}
        {fresh ? null : <dl className={styles.stats}>
          <div><dt>Answers</dt><dd>{summary.answers}</dd></div>
          <div><dt>Days studied</dt><dd>{summary.daysStudied}<small> of 7</small></dd></div>
          <div><dt>Topics practised</dt><dd>{summary.topicsPractised}<small> of {concepts.length}</small></dd></div>
        </dl>}
        {!summary.enough ? <Link href="/today" className={`k-btn ${styles.cta}`}>Practise a topic <span aria-hidden="true">→</span></Link> : null}
      </motion.section>

      {fresh ? null : <Topics title="Got stronger" note="Higher than a week ago." items={summary.stronger} empty="Nothing has moved up yet. It shows here as soon as an answer does." />}
      {fresh ? null : <Topics title="Needs another pass" note="Low, slipping, or your last answer missed." items={summary.needsPass} empty="No weak spots from your answers so far." />}
      {summary.notStarted.length ? <Topics title="Not started" note="No answers yet, so Kelus has no evidence either way." items={summary.notStarted} empty="" /> : null}

      {fresh ? null : <section className={styles.pace} aria-label="Pace to your target">
        <h3>To reach your target</h3>
        {examDatePending ? (
          <p>{summary.topicsLeft} topic{summary.topicsLeft === 1 ? " is" : "s are"} not strong yet. Add your exam date on the Study plan page and Kelus will work out how many topics a day you need.</p>
        ) : summary.topicsLeft > 0 ? (
          <p>
            {summary.topicsLeft} topic{summary.topicsLeft === 1 ? " is" : "s are"} not strong yet, with {daysToExam} day{daysToExam === 1 ? "" : "s"} left. That is about <strong>{summary.perDay} topic{summary.perDay === 1 ? "" : "s"} a day</strong>.
            {gap > 0 ? ` You are ${gap} point${gap === 1 ? "" : "s"} below your ${target}% target.` : ` You are at or above your ${target}% target.`}
          </p>
        ) : <p>Every topic looks strong from your answers. Keep a quick review going so it stays that way.</p>}
      </section>}
    </div>
  );
}
