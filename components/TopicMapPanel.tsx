"use client";

import { topicLevel } from "@/lib/format";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { ConceptTitleTransition } from "@/components/PageTransition";
import { generateRoute } from "@/domain/routing-engine";
import { AnkiExport } from "@/components/AnkiExport";
import { freshOpenSession, restAware, restingTopics, resumeConceptId } from "@/lib/today-focus";
import { describeRouteChoice } from "@/lib/today-reason";
import { percent } from "@/lib/format";
import styles from "./TopicMapPanel.module.css";


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
  const { state, removeTopic } = useLearner();
  const reduce = useReducedMotion() === true;
  const course = state.snapshot.courses[0];
  if (!course) return <p>No active course.</p>;

  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  const exam = state.snapshot.exams.find((item) => item.courseId === course.id && item.isActive);
  const routeStart = exam
    ? restAware(generateRoute({
        concepts,
        relationships: state.snapshot.relationships,
        events: state.snapshot.events,
        exam,
        nowIso: state.nowIso,
      }).allocations, state.snapshot.events, state.nowIso, concepts).find((item) => item.conceptId !== "mixed-retrieval")
    : undefined;
  // Answered in the last few hours: resting, not "due" yet, whatever the schedule says.
  const resting = restingTopics(state.snapshot.events, state.nowIso);
  // With a block open, "Start here" is the topic Continue opens on Today, not the one just answered.
  const openBlock = freshOpenSession(state.snapshot.sessions, course.id, state.nowIso);
  const resumeId = resumeConceptId(openBlock, state.snapshot.events);
  const startAllocation = resumeId ? (routeStart?.conceptId === resumeId ? routeStart : openBlock?.latestRoute.allocations.find((item) => item.conceptId === resumeId) ?? routeStart) : routeStart;
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
    const activity = state.snapshot.learningActivities.find((item) => item.conceptId === concept.id);
    const locator = activity?.sourceReferences[0]?.locator?.trim();
    const due = concept.retrievalAttempts > 0 && !resting.has(concept.id) && Boolean(concept.nextReviewAt) && Date.parse(concept.nextReviewAt!) <= Date.parse(state.nowIso);
    return {
      concept,
      label: topicLevel(concept.mastery, concept.retrievalAttempts),
      mastery: concept.retrievalAttempts > 0 ? concept.mastery : null,
      share: Math.round((Math.max(0, concept.examImportance) / totalWeight) * 100),
      page: locator && !/not your upload/i.test(locator) && !/^Section\b/.test(locator) ? locator : null,
      due,
    };
  });
  // The next topic leads; the rest keep exam-weight order.
  rows.sort((a, b) => Number(b.concept.id === startConceptId) - Number(a.concept.id === startConceptId));

  const tally = (label: string) => rows.filter((row) => row.label === label).length;
  const summary = [
    { label: "Solid", tone: styles.secure },
    { label: "Partly there", tone: styles.developing },
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
        {/* A removed topic shrinks away and the others glide into its place; Undo brings it back the same way. */}
        <AnimatePresence initial={false} mode="popLayout">
        {rows.map(({ concept, mastery, label, page, due }, index) => {
          const isStart = startConceptId === concept.id;
          const checks = concept.retrievalAttempts;
          // A new topic already says "Start here" / "Not started": the "no answers yet" reason would only repeat it.
          const reason = isStart && startAllocation && concept.retrievalAttempts > 0 ? describeRouteChoice(startAllocation, concept, { examDateKnown: !state.snapshot.exams.some((exam) => exam.isActive && exam.datePlaceholder) })[0] : null;
          return (
            <motion.li
              key={concept.id}
              layout={!reduce}
              className={`${styles.item}${isStart ? ` is-start ${styles.start}` : ""}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, scale: 0.94, filter: "blur(2px)", transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.025, layout: { type: "spring", stiffness: 420, damping: 38 } }}
            >
              <Link
                href={`/concept?id=${encodeURIComponent(concept.id)}`}
                className={`index-toc-row topic-card ${styles.card}${isStart ? " is-start" : ""}`}
               
              >
                <span className={`topic-card-main ${styles.main}`}>
                  <ConceptTitleTransition id={concept.id}>
                    <strong className="index-toc-name">{concept.name}</strong>
                  </ConceptTitleTransition>
                  <span className="index-toc-meta">
                    {isStart ? "Start here" : label}
                    {mastery == null ? "" : ` · ${percent(mastery)}`}
                  </span>
                  <span className={styles.facts}>
                    {/* Exam weights are estimated from how much text a topic has, not set by anyone, so no "% of exam" here. */}
                    {[page, checks === 0 ? null : `${checks} check${checks === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                  </span>
                  {due ? <span className={styles.due}>Review due</span> : null}
                  {reason ? <span className={styles.why}>{reason}</span> : null}
                </span>
                <MasteryRing value={mastery} />
              </Link>
              <button type="button" className={styles.remove} onClick={() => removeTopic(concept.id)} aria-label={`Remove ${concept.name}`} title="Remove topic (you can undo)">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ol>
      <AnkiExport course={course.name} concepts={concepts} activities={state.snapshot.learningActivities} />
    </div>
  );
}
