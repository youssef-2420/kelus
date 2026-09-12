"use client";

import Link from "next/link";
import { deriveStatus } from "@/domain/learner-model";
import type { Concept, ConceptRelationship } from "@/domain/types";
import { percent, statusLabel } from "@/lib/format";
import { ConceptTitleTransition } from "@/components/PageTransition";

type MapNode = { concept: Concept; x: number; y: number; rank: number; labelBelow: boolean };

/** Prefer short exam-map labels without ugly mid-word ellipsis. */
function shortLabel(name: string) {
  const aliases: Record<string, string> = {
    "Supply & Demand": "Supply/Demand",
    "Market Structures": "Markets",
    "Monetary Policy": "Monetary",
    "Fiscal Policy": "Fiscal",
    "Consumer Choice": "Consumer",
    "Game Theory": "Game theory",
    Elasticity: "Elasticity",
  };
  // Demo seed names (exact).
  if (aliases[name]) return aliases[name];
  if (name.length <= 14) return name;
  const cut = name.slice(0, 13);
  const space = cut.lastIndexOf(" ");
  return `${(space > 6 ? cut.slice(0, space) : cut).trim()}…`;
}

function layoutNodes(concepts: Concept[]): MapNode[] {
  const count = concepts.length;
  if (!count) return [];

  // Sparse layout: max 2 per row when labels need room (final audit).
  if (count === 1) {
    return [{ concept: concepts[0], x: 50, y: 32, rank: 0, labelBelow: false }];
  }
  if (count === 2) {
    return concepts.map((concept, index) => ({
      concept,
      x: 28 + index * 44,
      y: 32,
      rank: index,
      labelBelow: false,
    }));
  }

  // Two columns, labels always under the node so adjacent rows never collide.
  const cols = 2;
  const rows = Math.ceil(count / cols);
  return concepts.map((concept, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowCount = Math.min(cols, count - row * cols);
    const x0 = 18 + (cols - rowCount) * 32;
    return {
      concept,
      x: x0 + ((col + 0.5) * 64) / cols,
      y: 10 + ((row + 0.35) * 58) / Math.max(rows, 1),
      rank: index,
      labelBelow: true,
    };
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
  // Show every topic when the course is still small; never hide 7 as 4.
  const visibleConcepts = concepts.slice(0, 12);
  const nodes = layoutNodes(visibleConcepts);
  const byId = new Map(nodes.map((node) => [node.concept.id, node]));
  // Prerequisite spine only — related edges made the 7-node graph feel busy.
  const edges = relationships
    .map((rel) => {
      if (rel.kind !== "prerequisite") return null;
      const from = byId.get(rel.fromId);
      const to = byId.get(rel.toId);
      if (!from || !to) return null;
      return { id: rel.id, from, to, kind: rel.kind };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
    .slice(0, 6);

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
            <svg viewBox="0 0 100 78" className="topic-map-svg" data-layout="sparse" preserveAspectRatio="xMidYMid meet">
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  className={`topic-map-edge is-${edge.kind}`}
                  d={`M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
                />
              ))}
              {nodes.map((node) => {
                const selected = selectedId === node.concept.id;
                const radius = selected ? 3.2 : 2.6;
                const labelY = node.labelBelow ? node.y + 6.4 : node.y - 5.8;
                return (
                  <g
                    key={node.concept.id}
                    className={`topic-map-node${selected ? " is-selected" : ""}${node.labelBelow ? " is-label-below" : ""}`}
                    role={onSelect ? "button" : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={onSelect ? node.concept.name : undefined}
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
                    <text x={node.x} y={labelY} textAnchor="middle">
                      {shortLabel(node.concept.name)}
                    </text>
                  </g>
                );
              })}
            </svg>
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
