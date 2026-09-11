"use client";

import Link from "next/link";
import { deriveStatus } from "@/domain/learner-model";
import type { Concept, ConceptRelationship } from "@/domain/types";
import { percent, statusLabel } from "@/lib/format";
import { ConceptTitleTransition } from "@/components/PageTransition";

function layoutNodes(concepts: Concept[]) {
  const count = concepts.length;
  if (!count) return [] as Array<{ concept: Concept; x: number; y: number }>;
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
  const rows = Math.ceil(count / cols);
  return concepts.map((concept, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 12 + (col + 0.5) * (76 / cols);
    const y = 14 + (row + 0.5) * (72 / Math.max(rows, 1));
    return { concept, x, y };
  });
}

export function KnowledgeMap({
  courseName,
  mastery,
  concepts,
  relationships = [],
  heading = "Topic map",
  selectedId,
  onSelect,
}: {
  courseName: string;
  mastery: number;
  concepts: Concept[];
  relationships?: ConceptRelationship[];
  heading?: string | null;
  selectedId?: string | null;
  onSelect?: (concept: Concept) => void;
}) {
  const nodes = layoutNodes(concepts.slice(0, 12));
  const byId = new Map(nodes.map((node) => [node.concept.id, node]));
  const edges = relationships
    .map((rel) => {
      const from = byId.get(rel.fromId);
      const to = byId.get(rel.toId);
      if (!from || !to) return null;
      return { id: rel.id, from, to, kind: rel.kind };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
    .slice(0, 16);

  return (
    <section className="section topic-map" aria-labelledby={heading ? "map-heading" : undefined} aria-label={heading ? undefined : "Topic map"}>
      {heading ? <h2 id="map-heading">{heading}</h2> : null}
      <div className="map">
        <div className="map-head">
          <span>{courseName}</span>
          <strong>{percent(mastery)}</strong>
        </div>

        {nodes.length ? (
          <div className="topic-map-graph" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="topic-map-svg" preserveAspectRatio="xMidYMid meet">
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  className={`topic-map-edge is-${edge.kind}`}
                  d={`M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
                />
              ))}
              {nodes.map((node) => (
                <g key={node.concept.id} className={`topic-map-node${selectedId === node.concept.id ? " is-selected" : ""}`}>
                  <circle cx={node.x} cy={node.y} r={selectedId === node.concept.id ? 2.8 : 2.2} />
                  <text x={node.x} y={node.y + 6} textAnchor="middle">
                    {node.concept.name.length > 18 ? `${node.concept.name.slice(0, 16)}…` : node.concept.name}
                  </text>
                </g>
              ))}
            </svg>
            <p className="topic-map-graph-note">
              {edges.length
                ? "Lines show prerequisites and related topics you confirmed."
                : "Topics by exam importance — links appear when sources confirm relationships."}
            </p>
          </div>
        ) : null}

        <ul className="map-list" aria-label="Topics by exam importance">
          {concepts.map((concept) => {
            const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
            const title = (
              <ConceptTitleTransition id={concept.id}>
                <span className="map-concept-name">{concept.name}</span>
              </ConceptTitleTransition>
            );
            return (
              <li key={concept.id}>
                {onSelect ? (
                  <button
                    type="button"
                    className={`row${selectedId === concept.id ? " is-selected" : ""}`}
                    aria-pressed={selectedId === concept.id}
                    onClick={() => onSelect(concept)}
                  >
                    <span>
                      {title}
                      <span className="bar" aria-hidden="true">
                        <i style={{ width: percent(concept.mastery) }} />
                      </span>
                    </span>
                    <span className={`mark-status is-${status}`}>{statusLabel(status)}</span>
                    <span className="pct">{percent(concept.mastery)}</span>
                  </button>
                ) : (
                  <Link href={`/concepts/${encodeURIComponent(concept.id)}`} className="row" transitionTypes={["nav-forward"]} prefetch={true}>
                    <span>
                      {title}
                      <span className="bar" aria-hidden="true">
                        <i style={{ width: percent(concept.mastery) }} />
                      </span>
                    </span>
                    <span className={`mark-status is-${status}`}>{statusLabel(status)}</span>
                    <span className="pct">{percent(concept.mastery)}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
