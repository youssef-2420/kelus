"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { RouteVisual } from "./RouteVisual";
import {
  HERO_CONCEPTS,
  HERO_ROUTE,
  TOMORROW_ROUTE,
  type ConceptRow,
} from "./route-data";

type Phase =
  | "destination"
  | "position"
  | "terrain"
  | "calculate"
  | "route"
  | "event"
  | "reroute"
  | "hold";

const DESKTOP: Phase[] = [
  "destination",
  "position",
  "terrain",
  "calculate",
  "route",
  "event",
  "reroute",
  "hold",
];

const MOBILE: Phase[] = ["destination", "position", "route", "reroute", "hold"];

const DURATION: Record<Phase, number> = {
  destination: 1400,
  position: 1400,
  terrain: 1800,
  calculate: 1600,
  route: 1800,
  event: 1200,
  reroute: 1500,
  hold: 2000,
};

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

const layoutSpring = { type: "spring" as const, bounce: 0, duration: 0.55 };

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export function LearningRouteEngine() {
  const reduceMotion = useReducedMotion() === true;
  const narrow = useNarrow();
  const sequence = narrow ? MOBILE : DESKTOP;
  const [phase, setPhase] = useState<Phase>("destination");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const paused = Boolean(hoveredId);
  const viewPhase: Phase = reduceMotion ? "route" : phase;

  useEffect(() => {
    if (reduceMotion || paused) return;
    const timeout = window.setTimeout(() => {
      const index = sequence.indexOf(phase);
      const next = sequence[index === -1 ? 0 : (index + 1) % sequence.length];
      setPhase(next);
    }, DURATION[phase]);
    return () => window.clearTimeout(timeout);
  }, [phase, paused, reduceMotion, sequence]);

  const terrainOrder = useMemo(() => {
    const byMastery = [...HERO_CONCEPTS].sort((a, b) => a.mastery - b.mastery);
    if (viewPhase === "terrain") return byMastery;
    const routeIds = ["elasticity", "monetary", "fiscal", "game"];
    return routeIds
      .map((id) => HERO_CONCEPTS.find((item) => item.id === id))
      .filter((item): item is ConceptRow => Boolean(item));
  }, [viewPhase]);

  const showTerrain = viewPhase === "terrain" || viewPhase === "calculate";
  const showRoute = viewPhase === "route" || viewPhase === "event" || viewPhase === "reroute" || viewPhase === "hold";
  const hovered = HERO_ROUTE.find((item) => item.id === hoveredId) ?? HERO_CONCEPTS.find((item) => item.id === hoveredId);

  return (
    <section
      id="learning-route"
      className="route-engine"
      aria-label="Kelus learning route engine"
    >
      <header className="engine-kicker">
        <span>Learning route</span>
        <span className="engine-clock">45 min</span>
      </header>

      <div className="engine-destination">
        <p className="engine-label">Destination</p>
        <h2>Microeconomics Final</h2>
        <dl>
          <div>
            <dt>Target</dt>
            <dd>85%</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>11 days</dd>
          </div>
        </dl>
      </div>

      <AnimatePresence mode="wait">
        {(viewPhase === "position" || showTerrain || showRoute) && (
          <motion.div key="position" className="engine-position" {...fade}>
            <p className="engine-label">You’re here</p>
            <p className="engine-readiness">
              <span className="num">67%</span>
              <span>Exam readiness</span>
            </p>
            <p className="engine-available">45 min available today</p>
          </motion.div>
        )}
      </AnimatePresence>

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {showTerrain ? (
            <motion.div key="terrain" className="engine-terrain" {...fade}>
              <p className="engine-label">
                {viewPhase === "calculate" ? "Evaluating return" : "What you know"}
              </p>
              {viewPhase === "calculate" ? (
                <p className="engine-factors">
                  Exam importance · Mastery · Retention · Prerequisite impact · Time
                </p>
              ) : null}
              <ul>
                {terrainOrder.map((item) => (
                  <motion.li layout key={item.id} transition={layoutSpring}>
                    <span className="route-name">{item.name}</span>
                    <span className="num">{item.mastery}%</span>
                    <span className="quiet">{item.importance}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : null}

          {showRoute ? (
            <motion.div key="route" className="engine-route" {...fade}>
              <div className="engine-route-head">
                <p className="engine-label">Your route · 45 min</p>
                {viewPhase === "reroute" || viewPhase === "hold" ? (
                  <p className="engine-updated">Route updated</p>
                ) : null}
              </div>
              {viewPhase === "event" ? (
                <div className="engine-event">
                  <p className="engine-label">Elasticity</p>
                  <p>
                    Expected <b>Moderate</b>
                    <span aria-hidden="true"> · </span>
                    Actual <b>Weak</b>
                  </p>
                  <p className="engine-delta">
                    <span className="num">42%</span>
                    <span className="quiet"> → </span>
                    <span className="num">46%</span>
                  </p>
                </div>
              ) : null}
              {viewPhase === "reroute" || viewPhase === "hold" ? (
                <ol className="engine-tomorrow">
                  {TOMORROW_ROUTE.map((item, index) => (
                    <motion.li layout key={item.id} transition={layoutSpring}>
                      <span className="num">{String(index + 1).padStart(2, "0")}</span>
                      <span>{item.name}</span>
                      <span className="quiet">{item.note}</span>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <RouteVisual
                  items={HERO_ROUTE}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                  compact={narrow}
                />
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>

      {hovered && hoveredId && showRoute && viewPhase !== "reroute" && viewPhase !== "hold" ? (
        <aside className="engine-why" aria-live="polite">
          <p className="engine-label">Why this?</p>
          <p className="route-name">{hovered.name}</p>
          {"why" in hovered && hovered.why ? (
            <>
              <p>{hovered.why.importance}</p>
              <p>{hovered.why.mastery}</p>
              <p>{hovered.why.value}</p>
            </>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
