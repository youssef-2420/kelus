"use client";

import { useLearner } from "@/components/LearnerProvider";
import { courseEvidence } from "@/domain/mastery-evidence";
import { percent } from "@/lib/format";
import styles from "./MasteryEvidence.module.css";

export function MasteryEvidence() {
  const { state } = useLearner();
  const { snapshot, nowIso } = state;
  const concepts = snapshot.concepts.filter((c) => c.courseId === snapshot.courses[0]?.id);
  if (!concepts.length) return null;
  const evidence = courseEvidence(concepts, snapshot.prompts, snapshot.events, nowIso);

  return (
    <details className={styles.evidence} aria-label="Practice evidence">
      <summary>
        <span>Practice evidence</span>
        <small>
          Coverage {percent(evidence.coverage)}
          {evidence.mastery === null ? "" : ` · Mastery ${percent(evidence.mastery)}`}
        </small>
      </summary>
      <p>Weighted by exam importance — not a predicted grade.</p>
      {evidence.incomplete ? <p>Some topics do not have questions yet.</p> : null}
      {evidence.topics.some((topic) => topic.availableQuestions > 0 && topic.availableQuestions < 3) ? (
        <p>Some topics have only one or two questions.</p>
      ) : null}
      <div className={styles.topics}>
        {evidence.topics.map((topic, index) => (
          <section key={topic.conceptId}>
            <h3>
              {concepts[index]?.name ?? "Topic"} — {topic.readinessLabel}
            </h3>
            <p>
              {topic.attemptedQuestions}/{topic.availableQuestions} reviewed · Mastery:{" "}
              {topic.mastery === null ? "Not enough evidence" : percent(topic.mastery)} · {topic.attemptCount} attempts
            </p>
            {topic.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </section>
        ))}
      </div>
      <p className={styles.note}>Exam-ready needs coverage, mastery, and spaced attempts — not a guarantee.</p>
    </details>
  );
}
