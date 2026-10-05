"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { ConceptTitleTransition } from "@/components/PageTransition";
import { TopicArt, topicArtKind } from "@/components/TopicArt";
import { generateRoute } from "@/domain/routing-engine";
import { topicEvidence } from "@/domain/mastery-evidence";
import { describeRouteChoice } from "@/lib/today-reason";
import { percent } from "@/lib/format";
import styles from "./TopicMapPanel.module.css";

function statusLabel(mastery: number | null, attempts: number) {
  if (attempts < 1 || mastery == null) return "Not started";
  if (mastery >= 0.8) return "Secure";
  if (mastery >= 0.55) return "Developing";
  return "Needs work";
}

/** Mastery as a ring. No evidence means an empty dashed ring, never a made-up number. */
function MasteryRing({ value }: { value: number | null }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className={styles.ring} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle className={styles.ringTrack} cx="20" cy="20" r={radius} />
      {value == null ? <circle className={styles.ringDot} cx="20" cy="20" r="3" /> : null}
      {value != null ? (
        <circle
          className={styles.ringArc}
          cx="20"
          cy="20"
          r={radius}
          strokeDasharray={`${Math.max(0.02, value) * circumference} ${circumference}`}
          transform="rotate(-90 20 20)"
        />
      ) : null}
    </svg>
  );
}

/**
 * Topics as illustrated cards: what it is, where it came from, how much of the exam it carries,
 * what you can already recall, and whether it is due. The next topic comes first and says why.
 */
export function TopicMapPanel() {
  const { state } = useLearner();
  const reduce = useReducedMotion() === true;
  const course = state.snapshot.courses[0];
  if (!course) return <p>No active course.</p>;

  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  const exam = state.snapshot.exams.find((item) => item.courseId === course.id && item.isActive);
  const startAllocation = exam
    ? generateRoute({
        concepts,
        relationships: state.snapshot.relationships,
        events: state.snapshot.events,
        exam,
        nowIso: state.nowIso,
      }).allocations.find((item) => item.conceptId !== "mixed-retrieval")
    : undefined;
  const startConceptId = startAllocation?.conceptId ?? null;

  if (!concepts.length) {
    return (
      <div className="surface-map is-toc is-empty">
        <p>No topics yet. Add a page in the binder, then confirm what this exam covers.</p>
        <Link className="cta" href="/today?section=materials">
          Open binder <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  const totalWeight = concepts.reduce((sum, concept) => sum + Math.max(0, concept.examImportance), 0) || 1;
  const rows = concepts.map((concept) => {
    const evidence = topicEvidence(concept, state.snapshot.prompts, state.snapshot.events, state.nowIso);
    const activity = state.snapshot.learningActivities.find((item) => item.conceptId === concept.id);
    const locator = activity?.sourceReferences[0]?.locator?.trim();
    const due = concept.retrievalAttempts > 0 && Boolean(concept.nextReviewAt) && Date.parse(concept.nextReviewAt!) <= Date.parse(state.nowIso);
    return {
      concept,
      evidence,
      label: statusLabel(evidence.mastery, concept.retrievalAttempts),
      share: Math.round((Math.max(0, concept.examImportance) / totalWeight) * 100),
      page: locator && !/not your upload/i.test(locator) ? locator : null,
      due,
    };
  });
  // The next topic leads; the rest keep exam-weight order.
  rows.sort((a, b) => Number(b.concept.id === startConceptId) - Number(a.concept.id === startConceptId));

  const tally = (label: string) => rows.filter((row) => row.label === label).length;
  const summary = [
    { label: "Secure", tone: styles.secure },
    { label: "Developing", tone: styles.developing },
    { label: "Needs work", tone: styles.needs },
    { label: "Not started", tone: styles.none },
  ].map((item) => ({ ...item, count: tally(item.label) }));

  return (
    <div className="surface-map is-toc">
      <div className={styles.summary} role="group" aria-label="Topic readiness summary">
        <div className={styles.bar} aria-hidden="true">
          {summary.map((item) => (
            <span key={item.label} className={item.tone} style={{ flexGrow: item.count }} />
          ))}
        </div>
        <ul className={styles.legend}>
          {summary.filter((item) => item.count > 0).map((item) => (
            <li key={item.label}>
              <i className={item.tone} aria-hidden="true" />
              {item.count} {item.label.toLowerCase()}
            </li>
          ))}
        </ul>
      </div>
      <ol className={`index-toc topic-cards ${styles.grid}`} aria-label="Topics, next topic first">
        {rows.map(({ concept, evidence, label, share, page, due }, index) => {
          const isStart = startConceptId === concept.id;
          const checks = concept.retrievalAttempts;
          const reason = isStart && startAllocation ? describeRouteChoice(startAllocation, concept)[0] : null;
          return (
            <motion.li
              key={concept.id}
              className={isStart ? `is-start ${styles.start}` : undefined}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.5, delay: Math.min(index, 8) * 0.045 }}
            >
              <Link
                href={`/concept?id=${encodeURIComponent(concept.id)}`}
                className={`index-toc-row topic-card ${styles.card}${isStart ? " is-start" : ""}`}
                transitionTypes={["nav-forward"]}
                prefetch={true}
              >
                <span className={styles.art}><TopicArt kind={topicArtKind(concept.name)} /></span>
                <span className={`topic-card-main ${styles.main}`}>
                  <ConceptTitleTransition id={concept.id}>
                    <strong className="index-toc-name">{concept.name}</strong>
                  </ConceptTitleTransition>
                  <span className="index-toc-meta">
                    {isStart ? "Start here" : label}
                    {evidence.mastery == null ? "" : ` · ${percent(evidence.mastery)}`}
                  </span>
                  <span className={styles.facts}>
                    {page ? `${page} · ` : ""}{share}% of exam · {checks === 0 ? "No checks yet" : `${checks} check${checks === 1 ? "" : "s"}`}
                  </span>
                  {due ? <span className={styles.due}>Review due</span> : null}
                  {reason ? <span className={styles.why}>{reason}</span> : null}
                </span>
                <MasteryRing value={evidence.mastery} />
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
