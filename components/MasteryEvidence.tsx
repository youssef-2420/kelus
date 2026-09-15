"use client";
import { useLearner } from "@/components/LearnerProvider";
import { courseEvidence } from "@/domain/mastery-evidence";
import { percent } from "@/lib/format";
import styles from "./MasteryEvidence.module.css";

export function MasteryEvidence() {
  const { state } = useLearner();
  const { snapshot, nowIso } = state;
  const concepts = snapshot.concepts.filter(c => c.courseId === snapshot.courses[0]?.id);
  const evidence = courseEvidence(concepts, snapshot.prompts, snapshot.events, nowIso);
  return <section aria-label="Practice evidence" className={styles.evidence}>
    <h2>What you’ve worked on</h2>
    <p>Question coverage: {percent(evidence.coverage)} · Mastery on reviewed questions: {evidence.mastery === null ? "Not enough evidence" : percent(evidence.mastery)}</p>
    <p>Weighted by exam importance. Practice evidence, not a predicted grade or a measure of all your notes.</p>
    {evidence.incomplete ? <p>Coverage is incomplete: some topics do not have questions yet.</p> : null}
    {evidence.topics.some(topic => topic.availableQuestions > 0 && topic.availableQuestions < 3) ? <p>Some topics have only one or two questions. Reviewing them all does not establish broad topic mastery.</p> : null}
    <details><summary>See evidence by topic</summary>
      {evidence.topics.map((topic, index) => <section key={topic.conceptId}>
        <h3>{concepts[index].name} — {topic.readinessLabel}</h3>
        <p>{topic.attemptedQuestions}/{topic.availableQuestions} questions reviewed · Mastery: {topic.mastery === null ? "Not enough evidence" : percent(topic.mastery)} · {topic.attemptCount} attempts</p>
        {topic.reasons.map(reason => <p key={reason}>{reason}</p>)}
      </section>)}
      <p>Exam-ready requires 80% coverage and mastery, five attempts across three questions on two days, and no review due. This is not a guarantee.</p>
    </details>
  </section>;
}
