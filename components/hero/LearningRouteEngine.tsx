"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { RouteVisual } from "./RouteVisual";
import { HERO_ROUTE } from "./route-data";

type Beat = "idle" | "event" | "updated";

export function LearningRouteEngine() {
  const reduceMotion = useReducedMotion() === true;
  const [beat, setBeat] = useState<Beat>("idle");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const paused = Boolean(hoveredId);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const order: Beat[] = ["idle", "event", "updated", "idle"];
    const wait: Record<Beat, number> = { idle: 3200, event: 2200, updated: 2800 };
    const timeout = window.setTimeout(() => {
      const index = order.indexOf(beat);
      setBeat(order[(index + 1) % order.length]);
    }, wait[beat]);
    return () => window.clearTimeout(timeout);
  }, [beat, paused, reduceMotion]);

  const view = reduceMotion ? "idle" : beat;
  const hovered = HERO_ROUTE.find((item) => item.id === hoveredId);

  return (
    <section id="learning-route" className="route-engine" aria-label="Today’s study plan">
      <header className="engine-kicker">
        <span>Today</span>
        <span className="engine-clock">45 min</span>
      </header>

      <div className="engine-destination">
        <p className="engine-label">Microeconomics Final</p>
        <h2>11 days · Target 85%</h2>
        <p className="engine-readiness">
          <span className="num">67%</span>
          <span>ready</span>
        </p>
      </div>

      <AnimatePresence mode="wait">
        {view === "event" ? (
          <motion.div
            key="event"
            className="engine-event"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <p className="engine-label">Just now · Elasticity</p>
            <p>Expected moderate · Actual weak</p>
            <p className="engine-delta">
              <span className="num">42%</span>
              <span className="quiet"> → </span>
              <span className="num">46%</span>
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {view === "updated" ? <p className="engine-updated">Plan updated</p> : null}

      <RouteVisual
        items={HERO_ROUTE}
        hoveredId={hoveredId}
        onHover={setHoveredId}
        totalMinutes={45}
      />

      {hovered?.why ? (
        <aside className="engine-why" aria-live="polite">
          <p className="engine-label">Why this?</p>
          <p className="route-name">{hovered.name}</p>
          <p>{hovered.why.importance}</p>
          <p>{hovered.why.mastery}</p>
        </aside>
      ) : null}
    </section>
  );
}
