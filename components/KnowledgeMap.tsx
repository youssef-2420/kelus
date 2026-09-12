"use client";

import Link from "next/link";
import { deriveStatus } from "@/domain/learner-model";
import type { Concept, ConceptRelationship, ConceptStatus } from "@/domain/types";
import { percent, statusLabel } from "@/lib/format";
import { ConceptTitleTransition } from "@/components/PageTransition";

const STATUS_LEGEND: ConceptStatus[] = ["not_learned", "weak", "fading", "stable", "strong"];

function layoutNodes(concepts: Concept[]) {
  const count = concepts.length;
  if (!count) return [] as Array<{ concept: Concept; x: number; y: number; rank: number }>;

  // Packed layouts: fill the paper, keep labels readable.
  if (count === 1) {
    return [{ concept: concepts[0], x: 50, y: 38, rank: 0 }];
  }
  if (count <= 4) {
    return concepts.map((concept, index) => ({
      concept,
      x: 12 + ((index + 0.5) * 76) / count,
      y: 36,
      rank: index,
    }));
  }
  if (count <= 7) {
    const top = Math.ceil(count / 2);
    return concepts.map((concept, index) => {
      const onTop = index < top;
      const rowIndex = onTop ? index : index - top;
      const rowCount = onTop ? top : count - top;
      return {
        concept,
        x: 10 + ((rowIndex + 0.5) * 80) / rowCount,
        y: onTop ? 20 : 46,
        rank: index,
      };
    });
  }
  // 8–16: three tight rows, importance order left→right / top→bottom.
  const cols = Math.min(5, Math.ceil(count / 3));
  const rows = Math.ceil(count / cols);
  return concepts.map((concept, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      concept,
      x: 8 + ((col + 0.5) * 84) / cols,
      y: 14 + ((row + 0.5) * 48) / Math.max(rows, 1),
      rank: index,
    };
  });
}

function shortLabel(name: string) {
  if (name.length <= 22) return name;
  const cut = name.slice(0, 21);
  const space = cut.lastIndexOf(" ");
  return `${(space > 10 ? cut.slice(0, space) : cut).trim()}…`;
}

function nodeRadius(concept: Concept, selected: boolean) {
  const base = 2.1 + concept.examImportance * 1.7;
  return selected ? base + 0.55 : base;
}

export function KnowledgeMap({
  courseName,
  mastery,
  concepts,
  relationships = [],
  heading = "Topic map",
  selectedId,
  onSelect,
  examTargetPercent,
}: {
  courseName: string;
  mastery: number;
  concepts: Concept[];
  relationships?: ConceptRelationship[];
  heading?: string | null;
  selectedId?: string | null;
  onSelect?: (concept: Concept) => void;
  examTargetPercent?: number | null;
}) {
  // Show a full small course; raise the ceiling so sample maps feel owned.
  const visibleConcepts = concepts.slice(0, 16);
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
    .slice(0, 28);

  return (
    <section className="section topic-map" aria-labelledby={heading ? "map-heading" : undefined} aria-label={heading ? undefined : "Topic map"}>
      {heading ? <h2 id="map-heading">{heading}</h2> : null}
      <div className="map">
        <div className="map-head">
          <div className="map-head-copy">
            <span className="map-head-course">{courseName}</span>
            <span className="map-head-meta">
              {concepts.length} topic{concepts.length === 1 ? "" : "s"}
              {examTargetPercent != null ? ` · exam target ${Math.round(examTargetPercent)}%` : ""}
            </span>
          </div>
          <strong className="map-head-mastery" title="Course mastery from your evidence">
            {percent(mastery)}
          </strong>
        </div>

        {nodes.length ? (
          <div className="topic-map-graph">
            <ul className="topic-map-legend" aria-label="Status key">
              {STATUS_LEGEND.map((status) => (
                <li key={status}>
                  <span className={`mark-status is-${status}`}>{statusLabel(status)}</span>
                </li>
              ))}
            </ul>
            <svg viewBox="0 0 100 64" className="topic-map-svg" preserveAspectRatio="xMidYMid meet" aria-hidden={onSelect ? undefined : true}>
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  className={`topic-map-edge is-${edge.kind}`}
                  d={`M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
                />
              ))}
              {nodes.map((node) => {
                const selected = selectedId === node.concept.id;
                const status = deriveStatus(node.concept.mastery, node.concept.predictedRetention, node.concept.retrievalAttempts);
                const radius = nodeRadius(node.concept, selected);
                return (
                  <g
                    key={node.concept.id}
                    className={`topic-map-node is-${status}${selected ? " is-selected" : ""}${node.concept.examImportance >= 0.85 ? " is-exam-critical" : ""}`}
                    role={onSelect ? "button" : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={onSelect ? `${node.concept.name}, ${statusLabel(status)}, exam weight ${Math.round(node.concept.examImportance * 100)}%` : undefined}
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
                    <text x={node.x} y={node.y - (radius + 2.4)} textAnchor="middle">
                      {shortLabel(node.concept.name)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="topic-map-graph-note">
              Your {courseName} map · {nodes.length} of {concepts.length} topics
              {edges.length ? ` · ${edges.length} link${edges.length === 1 ? "" : "s"}` : " · links appear when sources confirm relationships"}
              {concepts.length > nodes.length ? " · list below has the rest" : ""}. Larger dots weigh more on the exam.
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
