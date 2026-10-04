"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { deriveStatus } from "@/domain/learner-model";
import { topicEvidence } from "@/domain/mastery-evidence";
import { confidenceLabel, daysAgoLabel, formatDay, percent } from "@/lib/format";
import { ConceptTitleTransition, DirectionalPage } from "@/components/PageTransition";
import styles from "./ConceptDetail.module.css";

const signalLabel = {
  not_learned: "Not reviewed yet",
  weak: "Needs another pass",
  fading: "Recall is fading",
  stable: "Holding up",
  strong: "Holding up well",
} as const;

const outcomeLabel = {
  success: "recalled",
  partial: "partly recalled",
  failure: "needs another pass",
} as const;

const eventLabel = {
  seed_rating: "Starting estimate",
  self_rating: "Self-check",
  retrieval: "Recall check",
  hint_used: "Hint used",
  answer_revealed: "Answer revealed",
} as const;

export function ConceptDetail({ conceptId }: { conceptId?: string }) {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const id = conceptId ?? search.get("id") ?? params.id;
  const { state } = useLearner();
  if (!state.onboardingCompleted) {
    return (
      <DirectionalPage>
        <AppShell><p className="kicker">Set up required</p><h1 className="today-title">Build your first route first.</h1><Link href="/today" className="cta">Set up your exam</Link></AppShell>
      </DirectionalPage>
    );
  }
  const concept = state.snapshot.concepts.find((item) => item.id === id);
  if (!concept) {
    return (
      <DirectionalPage>
        <AppShell><div className={styles.page}><h1 className={styles.title}>Topic not found.</h1><p className={styles.lede}>It may have been removed from your course.</p><Link href="/map" className="text-btn">Back to topics</Link></div></AppShell>
      </DirectionalPage>
    );
  }
  const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
  const evidence = topicEvidence(concept, state.snapshot.prompts, state.snapshot.events, state.nowIso);
  const courseName = state.snapshot.courses.find((course) => course.id === concept.courseId)?.name ?? "Your course";
  const events = state.snapshot.events.filter((event) => event.conceptId === concept.id).slice().reverse();
  const related = state.snapshot.relationships
    .filter((rel) => rel.fromId === concept.id || rel.toId === concept.id)
    .map((rel) => {
      const otherId = rel.fromId === concept.id ? rel.toId : rel.fromId;
      const other = state.snapshot.concepts.find((item) => item.id === otherId);
      return other ? { other, kind: rel.kind } : null;
    })
    .filter(Boolean);

  return (
    <DirectionalPage>
      <AppShell action={<nav className={styles.actions} aria-label="Topic navigation"><Link href="/map" transitionTypes={["nav-back"]}>← Topics</Link><Link href="/today">Study plan</Link></nav>}>
        <div className={styles.page}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>{courseName} · Topic</p>
            <ConceptTitleTransition id={concept.id}>
              <h1 className={styles.title}>{concept.name}</h1>
            </ConceptTitleTransition>
            <p className={styles.lede}>The route uses your recall history to decide when to revisit this topic.</p>
          </header>
          <section className={styles.signal} aria-label="Current practice signal">
            <div>
              <p className={styles.eyebrow}>Current signal</p>
              <h2>{signalLabel[status]}</h2>
              <p>{concept.retrievalAttempts === 0 ? "No recall checks yet." : `Based on ${concept.retrievalAttempts} recall check${concept.retrievalAttempts === 1 ? "" : "s"}.`}</p>
            </div>
            <dl>
              <div><dt>Practice mastery</dt><dd>{evidence.mastery === null ? "Not yet measured" : percent(evidence.mastery)}</dd></div>
              <div><dt>Question coverage</dt><dd>{evidence.availableQuestions ? percent(evidence.coverage) : "No questions yet"}</dd></div>
              <div><dt>Evidence</dt><dd>{confidenceLabel(concept.confidence)}</dd></div>
              <div><dt>Last checked</dt><dd>{daysAgoLabel(concept.lastReviewedAt, state.nowIso)}</dd></div>
              <div><dt>Next review</dt><dd>{concept.nextReviewAt ? formatDay(concept.nextReviewAt) : "Now"}</dd></div>
            </dl>
          </section>
          <section className={styles.section}>
            <h2>Learning history</h2>
            {events.length ? <ol className={styles.list}>
              {events.map((event) => (
                <li key={event.id}>
                  <span>{eventLabel[event.kind]}{event.outcome ? ` · ${outcomeLabel[event.outcome]}` : ""}</span>
                  <span>{formatDay(event.createdAt)}</span>
                </li>
              ))}
            </ol> : <p className={styles.empty}>Your practice will appear here after the first check.</p>}
          </section>
          <section className={styles.section}>
            <h2>Connected topics</h2>
            {related.length ? <ul className={styles.list}>
              {related.map((item) => item && (
                <li key={item.other.id}><Link href={`/concept?id=${encodeURIComponent(item.other.id)}`} transitionTypes={["nav-forward"]} prefetch={true}>{item.other.name} <span>↗</span></Link></li>
              ))}
            </ul> : <p className={styles.empty}>No confirmed topic links yet.</p>}
          </section>
        </div>
      </AppShell>
    </DirectionalPage>
  );
}
