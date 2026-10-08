"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InlineName } from "@/components/InlineName";
import { useLearner } from "@/components/LearnerProvider";
import { ConceptTitleTransition, DirectionalPage } from "@/components/PageTransition";
import { trackEvent } from "@/lib/analytics";
import styles from "./ConceptDetail.module.css";

const OUTCOME = { success: "Solid", partial: "Partly there", failure: "Missed" } as const;

/** Partly there, as a half-filled dot: the same marks as the end of a block. */
function Mark({ outcome }: { outcome: keyof typeof OUTCOME }) {
  if (outcome === "success") return <span className={`${styles.mark} ${styles.success}`} aria-hidden="true">✓</span>;
  if (outcome === "failure") return <span className={`${styles.mark} ${styles.failure}`} aria-hidden="true">↻</span>;
  return (
    <span className={`${styles.mark} ${styles.partial}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="13" height="13"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 1.75A6.25 6.25 0 0 0 8 14.25Z" fill="currentColor" /></svg>
    </span>
  );
}

/** Standalone, the page draws its own shell; inside the course workspace it is only the page. */
function Frame({ embedded, children }: { embedded: boolean; children: React.ReactNode }) {
  return embedded ? <>{children}</> : <DirectionalPage><AppShell>{children}</AppShell></DirectionalPage>;
}

function when(iso: string, nowIso: string) {
  const days = Math.round((Date.parse(nowIso) - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

function nextTime(iso: string | null, nowIso: string) {
  if (!iso) return null;
  const days = Math.ceil((Date.parse(iso) - Date.parse(nowIso)) / 86_400_000);
  if (days <= 0) return "it’s due now";
  if (days === 1) return "it comes back tomorrow";
  return `it comes back in ${days} days`;
}

/**
 * One topic, as a page you can act on: where you stand in a sentence, one button to study it, what your notes say
 * about it, and every answer you have given on it.
 */
export function ConceptDetail({ conceptId, embedded = false }: { conceptId?: string; /** Inside the course workspace, which already draws the sidebar and top bar. */ embedded?: boolean }) {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = conceptId ?? search.get("id") ?? params.id;
  const { renameTopic, start, abandon, state } = useLearner();
  if (!state.onboardingCompleted) {
    return (
      <Frame embedded={embedded}><div className={styles.page}><h1 className={styles.title}>Add your notes first.</h1><Link href="/today" className="k-btn">Start with your notes <span aria-hidden="true">→</span></Link></div></Frame>
    );
  }
  const concept = state.snapshot.concepts.find((item) => item.id === id);
  if (!concept) {
    return (
      <Frame embedded={embedded}><div className={styles.page}><h1 className={styles.title}>This topic is gone.</h1><p className={styles.lede}>It may have been removed from your course.</p><Link href="/today?section=map" className="text-btn">Back to Topics</Link></div></Frame>
    );
  }
  const course = state.snapshot.courses.find((item) => item.id === concept.courseId);
  const exam = state.snapshot.exams.find((item) => item.courseId === concept.courseId && item.isActive);
  const activity = state.snapshot.learningActivities.find((item) => item.conceptId === concept.id);
  const facts = (activity?.teach?.facts?.length ? activity.teach.facts : activity ? [activity.learn.explanation, ...activity.learn.keyPoints] : []).filter(Boolean).slice(0, 5);
  const locator = activity?.sourceReferences[0]?.locator;
  const answers = state.snapshot.events.filter((event) => event.conceptId === concept.id && event.kind === "retrieval" && event.outcome).slice().reverse();
  const checks = activity?.practice?.length ?? 0;
  const percent = Math.round(concept.mastery * 100);
  const comesBack = nextTime(concept.nextReviewAt, state.nowIso);
  // The same number Topics and Progress show: one model, so a topic never has two percentages.
  const answered = concept.retrievalAttempts;
  const standing = !answered
    ? `Not started. ${checks ? `${checks} questions are ready from your notes.` : "Its questions are ready from your notes."}`
    : `${percent >= 80 ? "Solid" : "Needs work"} · ${percent}% from ${answered} answer${answered === 1 ? "" : "s"}${comesBack ? `, and ${comesBack}` : ""}.`;

  function study() {
    if (!course || !exam || !concept) return;
    const open = state.snapshot.sessions.find((item) => item.courseId === course.id && item.status === "in_progress");
    if (open) abandon(open.id);
    const sessionId = start(course.id, exam.id, concept.id);
    trackEvent({ name: "session_started" });
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <Frame embedded={embedded}>
        <article className={styles.page}>
          <nav className={styles.crumbs} aria-label="Where you are">
            <Link href="/today?section=map">← Topics</Link>
          </nav>
          <header className={styles.header}>
            <ConceptTitleTransition id={concept.id}>
              <h1 className={styles.title}><InlineName value={concept.name} label="Rename topic" onSave={(next) => renameTopic(concept.id, next)} /></h1>
            </ConceptTitleTransition>
            <p className={styles.lede} data-testid="topic-standing">{standing}</p>
            <button type="button" className="k-btn" onClick={study} disabled={!course || !exam}>
              {answered ? "Study it again" : "Study this topic"} <span aria-hidden="true">→</span>
            </button>
          </header>

          {facts.length ? (
            <section className={styles.section} aria-labelledby="topic-notes">
              <h2 id="topic-notes">From your notes{locator ? <span>{locator}</span> : null}</h2>
              <ul className={styles.facts}>
                {facts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </section>
          ) : null}

          <section className={styles.section} aria-labelledby="topic-answers">
            <h2 id="topic-answers">Your answers</h2>
            {answers.length ? (
              <ol className={styles.answers}>
                {answers.slice(0, 12).map((event) => (
                  <li key={event.id}>
                    <Mark outcome={event.outcome!} />
                    <span>{OUTCOME[event.outcome!]}</span>
                    <time dateTime={event.createdAt}>{when(event.createdAt, state.nowIso)}</time>
                  </li>
                ))}
              </ol>
            ) : <p className={styles.empty}>None yet. Each answer shows here, and decides when the topic comes back.</p>}
          </section>
        </article>
    </Frame>
  );
}
