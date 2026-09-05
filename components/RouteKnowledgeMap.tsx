"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { Concept, RoutePlan } from "@/domain/types";
import { percent } from "@/lib/format";

const VIEW = { w: 1000, h: 360 };
const YOU = { x: 72, y: 210 };
const EXAM = { x: 928, y: 148 };
const ROUTE_SLOTS = [
  { x: 292, y: 198 },
  { x: 500, y: 176 },
  { x: 708, y: 158 },
] as const;
const QUIET_SLOTS = [
  { x: 360, y: 56 },
  { x: 520, y: 304 },
  { x: 760, y: 268 },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

function spine(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const mx = (prev.x + point.x) / 2;
      const my = (prev.y + point.y) / 2 - 14;
      return `Q ${mx} ${my} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function fork(from: { x: number; y: number }, to: { x: number; y: number }, pull: number) {
  const mx = (from.x + to.x) / 2 + pull;
  const my = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export function RouteKnowledgeMap({
  concepts,
  route,
  target,
}: {
  concepts: Concept[];
  route: RoutePlan;
  target: number;
}) {
  const reduce = useReducedMotion() === true;
  const [beat, setBeat] = useState(reduce ? 3 : 0);

  const routed = route.allocations
    .filter((item) => item.conceptId !== "mixed-retrieval")
    .map((allocation) => concepts.find((concept) => concept.id === allocation.conceptId))
    .filter((item): item is Concept => Boolean(item));
  const quiet = concepts.filter((concept) => !routed.some((item) => item.id === concept.id)).slice(0, QUIET_SLOTS.length);
  const stops = useMemo(() => [YOU, ...ROUTE_SLOTS.slice(0, Math.min(routed.length, ROUTE_SLOTS.length)), EXAM], [routed.length]);
  const active = spine(stops);
  const quietPaths = [
    fork(YOU, QUIET_SLOTS[0], 36),
    fork(QUIET_SLOTS[0], EXAM, -24),
    fork(ROUTE_SLOTS[0], QUIET_SLOTS[1], 18),
    fork(QUIET_SLOTS[1], QUIET_SLOTS[2], -12),
    fork(QUIET_SLOTS[2], EXAM, 10),
  ];

  useEffect(() => {
    if (reduce) return;
    const times = [0, 220, 640];
    const timers = times.map((time, index) => window.setTimeout(() => setBeat(index), time));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduce]);

  return (
    <figure className="route-map">
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="img" aria-labelledby="route-map-title">
        <title id="route-map-title">Recommended learning route from where you are to the exam</title>
        {quietPaths.map((d) => (
          <motion.path
            key={d}
            className="route-map-possibility"
            d={d}
            pathLength={1}
            initial={reduce ? false : { pathLength: 0 }}
            animate={beat >= 1 ? { pathLength: 1 } : { pathLength: reduce ? 1 : 0 }}
            transition={{ duration: 0.7, ease }}
          />
        ))}
        <motion.path
          className="route-map-active"
          d={active}
          pathLength={1}
          initial={reduce ? false : { pathLength: 0 }}
          animate={beat >= 2 ? { pathLength: 1 } : { pathLength: reduce ? 1 : 0 }}
          transition={{ duration: 0.9, ease }}
        />

        <g className="route-map-you" transform={`translate(${YOU.x} ${YOU.y})`}>
          <rect x="-7" y="-7" width="14" height="14" rx="4" />
          <text y="-18">You</text>
        </g>

        {routed.map((concept, index) => {
          const slot = ROUTE_SLOTS[index] ?? ROUTE_SLOTS[ROUTE_SLOTS.length - 1];
          return (
            <g key={concept.id} className="route-map-node" transform={`translate(${slot.x} ${slot.y})`}>
              <rect x="-6" y="-6" width="12" height="12" rx="4" />
              <text y="26">{concept.name}</text>
              <text className="route-map-value" y="42">{percent(concept.mastery)}</text>
            </g>
          );
        })}

        {quiet.map((concept, index) => {
          const slot = QUIET_SLOTS[index];
          if (!slot) return null;
          return (
            <g key={concept.id} className="route-map-quiet" transform={`translate(${slot.x} ${slot.y})`}>
              <rect x="-4" y="-4" width="8" height="8" rx="2" />
              <text x="12" y="4">{concept.name}</text>
            </g>
          );
        })}

        <g className="route-map-target" transform={`translate(${EXAM.x} ${EXAM.y})`}>
          <rect x="-10" y="-10" width="20" height="20" rx="4" />
          <text y="-22">Exam</text>
          <text className="route-map-target-num" y="36">{target}%</text>
        </g>
      </svg>
    </figure>
  );
}
