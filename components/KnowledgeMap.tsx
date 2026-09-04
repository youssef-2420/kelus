"use client";

import Link from "next/link";
import { deriveStatus } from "@/domain/learner-model";
import type { Concept } from "@/domain/types";
import { percent, statusLabel } from "@/lib/format";

export function KnowledgeMap({ courseName, mastery, concepts, heading = "Knowledge map" }: { courseName: string; mastery: number; concepts: Concept[]; heading?: string | null }) {
  return (
    <section className="section" aria-labelledby={heading ? "map-heading" : undefined} aria-label={heading ? undefined : "Knowledge map"}>
      {heading ? <h2 id="map-heading">{heading}</h2> : null}
      <div className="map">
        <div className="map-head">
          <span>{courseName}</span>
          <strong>{percent(mastery)}</strong>
        </div>
        <ul className="map-list">
          {concepts.map((concept) => {
            const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
            return (
              <li key={concept.id}>
                <Link href={`/concept/?id=${encodeURIComponent(concept.id)}`} className="row">
                  <span>
                    {concept.name}
                    <span className="bar" aria-hidden="true"><i style={{ width: percent(concept.mastery) }} /></span>
                  </span>
                  <span className={`mark-status is-${status}`}>{statusLabel(status)}</span>
                  <span className="pct">{percent(concept.mastery)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
