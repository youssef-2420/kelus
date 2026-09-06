"use client";

import Link from "next/link";
import type { Concept, ConceptRelationship, LearningEvent } from "@/domain/types";
import { deriveStatus } from "@/domain/learner-model";
import { daysAgoLabel, percent, statusLabel } from "@/lib/format";

export function ConceptInspector({ concept, concepts, relationships, events, nowIso, onClose }: {
  concept: Concept;
  concepts: Concept[];
  relationships: ConceptRelationship[];
  events: LearningEvent[];
  nowIso: string;
  onClose: () => void;
}) {
  const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
  const related = relationships
    .filter((relationship) => relationship.fromId === concept.id || relationship.toId === concept.id)
    .map((relationship) => {
      const id = relationship.fromId === concept.id ? relationship.toId : relationship.fromId;
      const other = concepts.find((item) => item.id === id);
      return other ? { concept: other, kind: relationship.kind } : null;
    })
    .filter((item): item is { concept: Concept; kind: ConceptRelationship["kind"] } => Boolean(item));
  const retrievals = events.filter((event) => event.conceptId === concept.id && event.kind === "retrieval").length;

  return (
    <aside className="concept-inspector" aria-labelledby="concept-inspector-title">
      <header>
        <span className={`mark-status is-${status}`}>{statusLabel(status)}</span>
        <button type="button" onClick={onClose} aria-label="Close concept details">Close</button>
      </header>
      <h2 id="concept-inspector-title">{concept.name}</h2>
      <p>One concept inside the current course route—not a separate destination.</p>

      <dl>
        <div><dt>Mastery</dt><dd>{percent(concept.mastery)}</dd></div>
        <div><dt>Retention</dt><dd>{percent(concept.predictedRetention)}</dd></div>
        <div><dt>Confidence</dt><dd>{percent(concept.confidence)}</dd></div>
        <div><dt>Last reviewed</dt><dd>{daysAgoLabel(concept.lastReviewedAt, nowIso)}</dd></div>
      </dl>

      <section>
        <span>Evidence</span>
        <p>{retrievals ? `${retrievals} retrieval${retrievals === 1 ? "" : "s"} recorded.` : "No retrieval evidence yet."}</p>
      </section>

      <section>
        <span>Connections</span>
        {related.length ? <ul>{related.map((item) => <li key={item.concept.id}><b>{item.concept.name}</b><small>{item.kind}</small></li>)}</ul> : <p>No linked concepts yet.</p>}
      </section>

      <Link href={`/concepts/${encodeURIComponent(concept.id)}`}>Open full learning history <span aria-hidden="true">→</span></Link>
    </aside>
  );
}
