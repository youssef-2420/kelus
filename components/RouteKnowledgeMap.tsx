"use client";

import type { Concept, RoutePlan } from "@/domain/types";
import { percent } from "@/lib/format";

const POSITIONS = [
  { x: 88, y: 282 }, { x: 210, y: 230 }, { x: 328, y: 158 }, { x: 455, y: 102 },
];

export function RouteKnowledgeMap({ concepts, route, readiness, target }: { concepts: Concept[]; route: RoutePlan; readiness: number; target: number }) {
  const routed = route.allocations.filter((item) => item.conceptId !== "mixed-retrieval");
  const routeConcepts = routed.map((allocation) => concepts.find((concept) => concept.id === allocation.conceptId)).filter((item): item is Concept => Boolean(item));
  const nodePositions = POSITIONS.slice(1);
  const path = [`M ${POSITIONS[0].x} ${POSITIONS[0].y}`, ...routeConcepts.map((_, index) => `L ${nodePositions[index].x} ${nodePositions[index].y}`)].join(" ");
  return (
    <figure className="route-map">
      <svg viewBox="0 0 560 340" role="img" aria-labelledby="route-map-title route-map-desc">
        <title id="route-map-title">Recommended route to the exam</title>
        <desc id="route-map-desc">A path from your current estimated readiness through the next concepts toward your target.</desc>
        <path className="route-map-possibility" d="M 88 282 C 180 278 160 120 260 176 S 390 270 520 56" />
        <path className="route-map-possibility" d="M 88 282 C 150 190 275 300 360 202 S 445 120 520 56" />
        <path className="route-map-active" d={`${path} L 520 56`} />
        <g className="route-map-you" transform="translate(88 282)"><circle r="18" /><text y="5">You</text></g>
        {routeConcepts.map((concept, index) => (
          <g key={concept.id} className="route-map-node" transform={`translate(${nodePositions[index]?.x ?? 455} ${nodePositions[index]?.y ?? 102})`}>
            <circle r="7" /><text x="14" y="-5">{concept.name}</text><text className="route-map-value" x="14" y="11">{percent(concept.mastery)}</text>
          </g>
        ))}
        <g className="route-map-target" transform="translate(520 56)"><circle r="24" /><circle r="14" /><text x="0" y="-34">Target {target}%</text></g>
      </svg>
      <figcaption>Estimated ready {percent(readiness)} · updates from retrieval</figcaption>
    </figure>
  );
}
