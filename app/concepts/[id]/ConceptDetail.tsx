"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { deriveStatus } from "@/domain/learner-model";
import { daysAgoLabel, formatDay, percent, statusLabel } from "@/lib/format";

export function ConceptDetail({ conceptId }: { conceptId?: string }) {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const id = conceptId ?? search.get("id") ?? params.id;
  const { state } = useLearner();
  if (!state.onboardingCompleted) {
    return <AppShell><p className="kicker">Set up required</p><h1 className="today-title">Build your first route first.</h1><Link href="/today" className="cta">Set up your exam</Link></AppShell>;
  }
  const concept = state.snapshot.concepts.find((item) => item.id === id);
  if (!concept) return <AppShell><p>Concept not found.</p></AppShell>;
  const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
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
    <AppShell action={<Link href="/today" className="text-btn">Today</Link>}>
      <p className={`mark-status is-${status}`}>{statusLabel(status)}</p>
      <h1 className="page-title">{concept.name}</h1>
      <section className="detail">
        <dl>
          <div><dt>Mastery</dt><dd>{percent(concept.mastery)}</dd></div>
          <div><dt>Predicted retention</dt><dd>{percent(concept.predictedRetention)}</dd></div>
          <div><dt>Confidence</dt><dd>{percent(concept.confidence)}</dd></div>
          <div><dt>Last reviewed</dt><dd>{daysAgoLabel(concept.lastReviewedAt, state.nowIso)}</dd></div>
          <div><dt>Next review</dt><dd>{concept.nextReviewAt ? formatDay(concept.nextReviewAt) : "Now"}</dd></div>
          <div><dt>Retrievals</dt><dd>{concept.retrievalAttempts}</dd></div>
        </dl>
      </section>
      <section className="section">
        <h2>Learning history</h2>
        <ol className="history">
          {events.map((event) => (
            <li key={event.id}>
              <span>{event.kind === "seed_rating" ? "Initial rating" : "Retrieval"} · {event.outcome}</span>
              <span className="quiet">{percent(event.masteryAfter)}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="section related">
        <h2>Related concepts</h2>
        {related.length ? related.map((item) => item && (
          <Link key={item.other.id} href={`/concept/?id=${encodeURIComponent(item.other.id)}`}>{item.other.name} · {item.kind}</Link>
        )) : <p className="quiet">No linked concepts yet.</p>}
      </section>
    </AppShell>
  );
}
