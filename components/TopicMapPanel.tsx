"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useLearner } from "@/components/LearnerProvider";
import { ConceptTitleTransition } from "@/components/PageTransition";
import { generateRoute } from "@/domain/routing-engine";
import { topicEvidence } from "@/domain/mastery-evidence";
import { percent } from "@/lib/format";
import { kelusEase } from "@/components/motion";
import styles from "./TopicMapPanel.module.css";

// We'll replace text status with visual progress indicators
// Keeping this function for potential other uses or reference
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

  return (
    <div className="surface-map is-toc">
      <ol className="index-toc" aria-label="Topics by exam weight">
        {concepts.map((concept, index) => {
          const evidence = topicEvidence(concept, state.snapshot.prompts, state.snapshot.events, state.nowIso);
          const isStart = startConceptId === concept.id;
          const masteryPercent = evidence.mastery ?? 0;

          return (
            <li key={concept.id} className={isStart ? "is-start" : undefined}>
              <Link
                href={`/concepts/${encodeURIComponent(concept.id)}`}
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
                  <span className="index-toc-meta">
                    {isStart ? (
                      <>
                        Start here
                        {!useReducedMotion() && (
                          <motion.div
                            className={`${styles.progressRingContainer}`}
                            whileInView={{ scale: [0.8, 1, 1] }}
                            transition={{ duration: 0.6, ease: kelusEase }}
                          >
                            <motion.circle
                              cx="12"
                              cy="12"
                              r="10"
                              strokeWidth="2"
                              stroke="currentColor"
                              strokeOpacity={0.2}
                            />
                            <motion.circle
                              cx="12"
                              cy="12"
                              r="10"
                              strokeWidth="2"
                              stroke="currentColor"
                              strokeDasharray={`${masteryPercent * 62.83} 62.83`}
                              strokeLinecap="round"
                              strokeDashoffset="62.83"
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 0.8, ease: kelusEase }}
                            />
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className={`status-label ${masteryPercent >= 0.8 ? 'secure' : masteryPercent >= 0.55 ? 'developing' : 'needs-work'}`}>
                          {masteryPercent >= 0.8 ? "Secure" : masteryPercent >= 0.55 ? "Developing" : "Needs work"}
                        </span>
                        {!useReducedMotion() && masteryPercent > 0 && (
                          <motion.div
                            className={`${styles.progressRingContainer}`}
                            style={{ width: "20px", height: "20px", display: "inline-block", marginLeft: "6px" }}
                            whileInView={{ scale: [0.8, 1, 1] }}
                            transition={{ duration: 0.6, ease: kelusEase }}
                          >
                            <motion.circle
                              cx="10"
                              cy="10"
                              r="8"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              strokeOpacity={0.2}
                            />
                            <motion.circle
                              cx="10"
                              cy="10"
                              r="8"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              strokeDasharray={`${masteryPercent * 50.265} 50.265`}
                              strokeDashoffset="50.265"
                              strokeLinecap="round"
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 0.8, ease: kelusEase }}
                            />
                          </motion.div>
                        )}
                      </>
                    )}
                    {evidence.mastery == null ? "" : ` · ${percent(evidence.mastery)}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
