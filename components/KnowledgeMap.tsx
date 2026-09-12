"use client";

import Link from "next/link";
import { deriveStatus } from "@/domain/learner-model";
import type { Concept, ConceptRelationship } from "@/domain/types";
import { percent, statusLabel } from "@/lib/format";
import { ConceptTitleTransition } from "@/components/PageTransition";

function layoutNodes(concepts: Concept[]) {
  const count = concepts.length;
  if (!count) return [] as Array<{ concept: Concept; x: number; y: number; rank: number }>;

  // Arc / packed layout: denser canvas, readable labels, less empty paper.
  if (count === 1) {
    return [{ concept: concepts[0], x: 50, y: 36, rank: 0 }];
  }
  if (count <= 4) {
    return concepts.map((concept, index) => ({
      concept,
      x: 14 + ((index + 0.5) * 72) / count,
      y: 34,
      rank: index,
    }));
  }
  if (count <= 7) {
    // Two rows: top row highest importance, bottom the rest — tight vertical.
    const top = Math.ceil(count / 2);
    return concepts.map((concept, index) => {
      const onTop = index < top;
      const rowIndex = onTop ? index : index - top;
      const rowCount = onTop ? top : count - top;
      return {
        concept,
        x: 12 + ((rowIndex + 0.5) * 76) / rowCount,
        y: onTop ? 22 : 48,
        rank: index,
      };
    });
  }
  const cols = Math.min(4, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return concepts.map((concept, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      concept,
      x: 10 + ((col + 0.5) * 80) / cols,
      y: 14 + ((row + 0.5) * 52) / Math.max(rows, 1),
      rank: index,
    };
  });
}

function shortLabel(name: string) {
  if (name.length <= 18) return name;
  const cut = name.slice(0, 17);
  const space = cut.lastIndexOf(" ");
  return `${(space > 8 ? cut.slice(0, space) : cut).trim()}…`;
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
  // Show every topic when the course is still small; never hide 7 as 4.
  const visibleConcepts = concepts.slice(0, 12);
  const nodes = layoutNodes(visibleConcepts);
  const byId = new Map(nodes.map((node) => [node.concept.id, node]));
  const edges = relationships
    .map((rel) => {
      const from = byId.get(rel.fromId);
      const to = byId.get(rel.toId);
      if (!from || !to) return null;
      return { id: rel.id, from, to, kind: rel.kind };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
    .slice(0, 20);

  return (
    <section className="section topic-map" aria-labelledby={heading ? "map-heading" : undefined} aria-label={heading ? undefined : "Topic map"}>
      {heading ? <h2 id="map-heading">{heading}</h2> : null}
      <div className="map">
        <div className="map-head">
          <span>{courseName}</span>
          <strong>{percent(mastery)}</strong>
        </div>

        {nodes.length ? (
          <div className="topic-map-graph" aria-hidden={onSelect ? undefined : true}>
            <svg viewBox="0 0 100 62" className="topic-map-svg" preserveAspectRatio="xMidYMid meet">
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  className={`topic-map-edge is-${edge.kind}`}
                  d={`M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
                />
              ))}
              {nodes.map((node) => {
                const selected = selectedId === node.concept.id;
                const status = deriveStatus(
                  node.concept.mastery,
                  node.concept.predictedRetention,
                  node.concept.retrievalAttempts,
                );
                const radius = selected ? 3.4 : 2.8;
                return (
                  <g
                    key={node.concept.id}
                    className={`topic-map-node is-${status}${selected ? " is-selected" : ""}`}
                    role={onSelect ? "button" : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={
                      onSelect
                        ? `${node.concept.name}, ${statusLabel(status)}`
                        : undefined
                    }
                    onClick={onSelect ? () => onSelect(node.concept) : undefined}
                    onKeyDown={
                      onSelect
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelect(node.concept);
                            }
                          }
                        : undefined
                    }
                    style={onSelect ? { cursor: "pointer" } : undefined}
                  >
                    <circle cx={node.x} cy={node.y} r={radius} />
                    <text x={node.x} y={node.y - 5.5} textAnchor="middle">
                      {shortLabel(node.concept.name)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <ul className="topic-map-legend" aria-label="Topic status colours">
              <li><i className="is-strong" aria-hidden="true" /> Strong</li>
              <li><i className="is-stable" aria-hidden="true" /> Stable</li>
              <li><i className="is-fading" aria-hidden="true" /> Fading</li>
              <li><i className="is-weak" aria-hidden="true" /> Weak</li>
              <li><i className="is-not_learned" aria-hidden="true" /> New</li>
            </ul>
            <p className="topic-map-graph-note">
              {nodes.length} of {concepts.length} topics on the map
              {edges.length ? ` · ${edges.length} link${edges.length === 1 ? "" : "s"} between them` : " · links appear when sources confirm relationships"}
              {concepts.length > nodes.length ? " · list below has the rest" : ""}.
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
