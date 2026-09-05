"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { Concept, RoutePlan } from "@/domain/types";
import { percent } from "@/lib/format";

const VIEW = { w: 1000, h: 420 };
const YOU = { x: 88, y: 248 };
const EXAM = { x: 912, y: 152 };
const ROUTE_SLOTS = [
  { x: 318, y: 228 },
  { x: 528, y: 196 },
  { x: 718, y: 168 },
] as const;
const QUIET_SLOTS = [
  { x: 392, y: 72 },
  { x: 548, y: 348 },
  { x: 762, y: 292 },
] as const;

export const ease = [0.22, 1, 0.36, 1] as const;
export const ROUTE_BEATS = {
  dest: 0,
  nodes: 0.18,
  quiet: 0.48,
  path: 0.86,
  ready: 1.28,
  plan: 1.62,
} as const;

function ReadyNow({ value, play, reduce }: { value: number; play: boolean; reduce: boolean }) {
  const count = useMotionValue(reduce ? Math.round(value * 100) : 0);
  const [shown, setShown] = useState(reduce ? Math.round(value * 100) : 0);

  useEffect(() => {
    const unsub = count.on("change", (next) => setShown(Math.round(next)));
    return () => unsub();
  }, [count]);

  useEffect(() => {
    if (!play) return;
    const control = animate(count, Math.round(value * 100), { duration: reduce ? 0 : 0.72, ease });
    return () => control.stop();
  }, [count, play, reduce, value]);

  return (
    <text className="route-map-ready-num" textAnchor="middle">
      {shown}%
    </text>
  );
}

function spine(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const mx = (prev.x + point.x) / 2;
      const my = (prev.y + point.y) / 2 - 18;
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
  readiness,
  target,
}: {
  concepts: Concept[];
  route: RoutePlan;
  readiness: number;
  target: number;
}) {
  const reduce = useReducedMotion() === true;
  const [beat, setBeat] = useState(reduce ? 5 : 0);

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
    const times = [0, 180, 480, 860, 1280, 1620];
    const timers = times.map((time, index) => window.setTimeout(() => setBeat(index), time));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduce]);

  return (
    <figure className="route-map">
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="img" aria-labelledby="route-map-title">
        <title id="route-map-title">Recommended learning route from where you are to the exam</title>
        {quietPaths.map((d, index) => (
          <motion.path
            key={d}
            className="route-map-possibility"
            d={d}
            pathLength={1}
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={beat >= 2 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.7, ease, delay: index * 0.04 }}
          />
        ))}
        <motion.path
          className="route-map-active"
          d={active}
          pathLength={1}
          initial={reduce ? false : { pathLength: 0 }}
          animate={beat >= 3 ? { pathLength: 1 } : { pathLength: reduce ? 1 : 0 }}
          transition={{ duration: 0.95, ease }}
        />

        <motion.g
          className="route-map-target"
          transform={`translate(${EXAM.x} ${EXAM.y})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease }}
        >
          <circle r="18" />
          <circle r="7" />
          <text y="-30">Exam</text>
          <text className="route-map-target-num" y="40">
            {target}%
          </text>
        </motion.g>

        <motion.g
          className="route-map-you"
          transform={`translate(${YOU.x} ${YOU.y})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={beat >= 1 ? { opacity: 1 } : { opacity: reduce ? 1 : 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <circle r="10" />
          <text y="-22">You</text>
        </motion.g>

        {routed.map((concept, index) => {
          const slot = ROUTE_SLOTS[index] ?? ROUTE_SLOTS[ROUTE_SLOTS.length - 1];
          return (
            <motion.g
              key={concept.id}
              className="route-map-node"
              transform={`translate(${slot.x} ${slot.y})`}
              initial={reduce ? false : { opacity: 0 }}
              animate={beat >= 1 ? { opacity: 1 } : { opacity: reduce ? 1 : 0 }}
              transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.06 * index }}
            >
              <circle r="8" />
              <text x="14" y="-8">
                {concept.name}
              </text>
              <text className="route-map-value" x="14" y="12">
                {percent(concept.mastery)}
              </text>
            </motion.g>
          );
        })}

        {quiet.map((concept, index) => {
          const slot = QUIET_SLOTS[index];
          if (!slot) return null;
          return (
            <motion.g
              key={concept.id}
              className="route-map-quiet"
              transform={`translate(${slot.x} ${slot.y})`}
              initial={reduce ? false : { opacity: 0 }}
              animate={beat >= 1 ? { opacity: 1 } : { opacity: reduce ? 1 : 0 }}
              transition={{ duration: 0.45, ease, delay: 0.08 }}
            >
              <circle r="4.5" />
              <text x="11" y="4">
                {concept.name}
              </text>
            </motion.g>
          );
        })}

        <motion.g
          className="route-map-ready"
          transform={`translate(${YOU.x} ${YOU.y + 46})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={beat >= 4 ? { opacity: 1 } : { opacity: reduce ? 1 : 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <ReadyNow value={readiness} play={beat >= 4} reduce={reduce} />
          <text className="route-map-ready-label" y="22" textAnchor="middle">
            Ready now
          </text>
        </motion.g>
      </svg>
    </figure>
  );
}
