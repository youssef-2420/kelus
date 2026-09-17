"use client";

import Link from "next/link";
import { deriveStatus } from "@/domain/learner-model";
import type { Concept, ConceptRelationship } from "@/domain/types";
import { percent, statusLabel } from "@/lib/format";
import { ConceptTitleTransition } from "@/components/PageTransition";
import { useLearner } from "@/components/LearnerProvider";
import { topicEvidence } from "@/domain/mastery-evidence";

type MapNode = { concept: Concept; x: number; y: number; rank: number; labelBelow: boolean };

/** Prefer readable exam-map labels without mid-word ellipsis. */
function shortLabel(name: string) {
  const aliases: Record<string, string> = {
    "Supply & Demand": "Supply / demand",
    "Market Structures": "Market structures",
    "Monetary Policy": "Monetary policy",
    "Fiscal Policy": "Fiscal policy",
    "Consumer Choice": "Consumer choice",
    "Game Theory": "Game theory",
    Elasticity: "Elasticity",
  };
  if (aliases[name]) return aliases[name];
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 22) return cleaned;
  const cut = cleaned.slice(0, 21);
  const space = cut.lastIndexOf(" ");
  return `${(space > 8 ? cut.slice(0, space) : cut).trim()}…`;
}

function layoutNodes(concepts: Concept[]): MapNode[] {
  const count = concepts.length;
  if (!count) return [];

  if (count === 1) {
    return [{ concept: concepts[0], x: 50, y: 28, rank: 0, labelBelow: true }];
  }
  if (count === 2) {
    return concepts.map((concept, index) => ({
      concept,
      x: 28 + index * 44,
      y: 28,
      rank: index,
      labelBelow: true,
    }));
  }

  // Two columns with generous row pitch so labels under nodes never collide.
  const cols = 2;
  const rows = Math.ceil(count / cols);
  const top = 8;
  const rowPitch = 16;
  return concepts.map((concept, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowCount = Math.min(cols, count - row * cols);
    const x0 = 16 + (cols - rowCount) * 34;
    return {
      concept,
      x: x0 + ((col + 0.5) * 68) / cols,
      y: top + row * rowPitch,
      rank: index,
      labelBelow: true,
    };
  });
}

function mapViewBox(nodeCount: number) {
  if (nodeCount <= 2) return "0 0 100 56";
  const rows = Math.ceil(nodeCount / 2);
  const height = Math.max(56, 8 + rows * 16 + 12);
  return `0 0 100 ${height}`;
}

function nodeCaption(concept: Concept, status: ReturnType<typeof deriveStatus>, isStart: boolean) {
  if (isStart) return "Start here";
  const weight =
    concept.examImportance >= 0.85 ? "High weight" : concept.examImportance >= 0.7 ? "Exam weight" : null;
  if (status === "weak" || status === "not_learned" || status === "fading") {
    return weight ? `${statusLabel(status)} · ${weight}` : statusLabel(status);
  }
  return weight ?? statusLabel(status);
}

export function KnowledgeMap({
  courseName,
  concepts,
  relationships = [],
  heading = "Topic map",
  selectedId,
  startConceptId = null,
  onSelect,
}: {
  courseName: string;
  mastery: number;
  concepts: Concept[];
  relationships?: ConceptRelationship[];
  heading?: string | null;
  selectedId?: string | null;
  startConceptId?: string | null;
  onSelect?: (concept: Concept) => void;
}) {
  const { state } = useLearner();
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
  const startOnGraph = Boolean(startConceptId && byId.has(startConceptId));

  return (
    <section className="section topic-map" aria-labelledby={heading ? "map-heading" : undefined} aria-label={heading ? undefined : "Topic map"}>
      {heading ? <h2 id="map-heading">{heading}</h2> : null}
      <div className="map">
        {heading ? (
          <div className="map-head">
            <span>{courseName}</span>
            <span>Evidence by topic</span>
          </div>
        ) : null}

        {nodes.length ? (
          <div className="topic-map-graph" aria-hidden={onSelect ? undefined : true}>
            <svg viewBox={mapViewBox(nodes.length)} className="topic-map-svg" data-layout="sparse" preserveAspectRatio="xMidYMid meet">
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  className={`topic-map-edge is-${edge.kind}`}
                  d={`M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
                />
              ))}
              {nodes.map((node) => {
                const selected = selectedId === node.concept.id;
                const isStart = startConceptId === node.concept.id;
                const status = deriveStatus(node.concept.mastery, node.concept.predictedRetention, node.concept.retrievalAttempts);
                const radius = selected || isStart ? 2.8 : status === "weak" || status === "not_learned" ? 2.5 : 2.2;
                const labelY = node.y + 5.2;
                const caption = nodeCaption(node.concept, status, isStart);
                return (
                  <g
                    key={node.concept.id}
                    className={`topic-map-node is-${status}${selected ? " is-selected" : ""}${isStart ? " is-start" : ""} is-label-below`}
                    role={onSelect ? "button" : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={onSelect ? `${node.concept.name}, ${caption}` : undefined}
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
                    <title>{node.concept.name} — {caption}</title>
                    <text x={node.x} y={labelY} textAnchor="middle" dominantBaseline="hanging">
                      {shortLabel(node.concept.name)}
                    </text>
                    <text className="topic-map-status" x={node.x} y={labelY + 4.2} textAnchor="middle" dominantBaseline="hanging">
                      {caption}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="topic-map-graph-note">
              {startOnGraph
                ? "Green marks what still needs work · Start here is first on today’s route"
                : `${nodes.length} of ${concepts.length} topics on the map${edges.length ? ` · ${edges.length} link${edges.length === 1 ? "" : "s"} between them` : ""}`}
              {concepts.length > nodes.length ? " · full list below" : ""}.
            </p>
          </div>
        ) : null}

        <details className="map-list-details" open={!startOnGraph || concepts.length < 4}>
          <summary>All topics by exam weight</summary>
          <ul className="map-list" aria-label="Topics by exam importance">
            {concepts.map((concept) => {
              const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
              const evidence = topicEvidence(concept, state.snapshot.prompts, state.snapshot.events, state.nowIso);
              const isStart = startConceptId === concept.id;
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
                      className={`row${selectedId === concept.id ? " is-selected" : ""}${isStart ? " is-start" : ""}`}
                      aria-pressed={selectedId === concept.id}
                      onClick={() => onSelect(concept)}
                    >
                      <span>
                        {title}
                        <span className="bar" aria-hidden="true">
                          <i style={{ width: percent(evidence.mastery ?? 0) }} />
                        </span>
                      </span>
                      <span className={`mark-status is-${status}`}>{isStart ? "Start here" : statusLabel(status)}</span>
                      <span className="pct" title="Mastery on reviewed questions">{evidence.mastery === null ? "—" : percent(evidence.mastery)}</span>
                    </button>
                  ) : (
                    <Link href={`/concepts/${encodeURIComponent(concept.id)}`} className={`row${isStart ? " is-start" : ""}`} transitionTypes={["nav-forward"]} prefetch={true}>
                      <span>
                        {title}
                        <span className="bar" aria-hidden="true">
                          <i style={{ width: percent(evidence.mastery ?? 0) }} />
                        </span>
                      </span>
                      <span className={`mark-status is-${status}`}>{isStart ? "Start here" : statusLabel(status)}</span>
                      <span className="pct" title="Mastery on reviewed questions">{evidence.mastery === null ? "—" : percent(evidence.mastery)}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}
