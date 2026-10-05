"use client";

import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { ConceptTitleTransition } from "@/components/PageTransition";
import { generateRoute } from "@/domain/routing-engine";
import { topicEvidence } from "@/domain/mastery-evidence";
import { percent } from "@/lib/format";
import styles from "./TopicMapPanel.module.css";

function statusLabel(mastery: number | null, attempts: number) {
  if (attempts < 1 || mastery == null) return "Not started";
  if (mastery >= 0.8) return "Secure";
  if (mastery >= 0.55) return "Developing";
  return "Needs work";
}

/**
 * Index is a paper table of contents — weight-ordered topics, one start mark.
 * No graph, search chrome, or live inspector panel.
 */
export function TopicMapPanel() {
  const { state } = useLearner();
  const course = state.snapshot.courses[0];
  if (!course) return <p>No active course.</p>;

  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  const exam = state.snapshot.exams.find((item) => item.courseId === course.id && item.isActive);
  const startConceptId = exam
    ? (generateRoute({
        concepts,
        relationships: state.snapshot.relationships,
        events: state.snapshot.events,
        exam,
        nowIso: state.nowIso,
      }).allocations.find((item) => item.conceptId !== "mixed-retrieval")?.conceptId ?? null)
    : null;

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

  const rows = concepts.map((concept) => {
    const evidence = topicEvidence(concept, state.snapshot.prompts, state.snapshot.events, state.nowIso);
    return { concept, evidence, label: statusLabel(evidence.mastery, concept.retrievalAttempts) };
  });
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
      <ol className="index-toc" aria-label="Topics by exam weight">
        {rows.map(({ concept, evidence, label }, index) => {
          const isStart = startConceptId === concept.id;
          return (
            <li key={concept.id} className={isStart ? "is-start" : undefined}>
              <Link
                href={`/concept?id=${encodeURIComponent(concept.id)}`}
                className={`index-toc-row${isStart ? " is-start" : ""}`}
                transitionTypes={["nav-forward"]}
                prefetch={true}
              >
                <span className="index-toc-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="index-toc-main">
                  <ConceptTitleTransition id={concept.id}>
                    <strong className="index-toc-name">{concept.name}</strong>
                  </ConceptTitleTransition>
                  <span className={styles.meter} aria-hidden="true">
                    <span style={{ width: `${Math.round((evidence.mastery ?? 0) * 100)}%` }} />
                  </span>
                </span>
                <span className="index-toc-meta">
                  {isStart ? "Start here" : label}
                  {evidence.mastery == null ? "" : ` · ${percent(evidence.mastery)}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
