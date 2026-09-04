"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import { KnowledgeLandscape } from "@/components/hero/KnowledgeLandscape";
import { NODE_MAP } from "@/components/hero/landscape-data";
import { phaseAtLeast, useHeroTimeline } from "@/components/hero/useHeroTimeline";

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia("(max-width: 860px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useMobileLayout() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 860px)").matches,
    () => false,
  );
}

export function KnowledgeRouteStory() {
  const reduceMotion = useReducedMotion() === true;
  const mobile = useMobileLayout();
  const layout = mobile ? "mobile" : "desktop";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { amount: 0.28 });
  const phase = useHeroTimeline(reduceMotion, !inView || Boolean(hoveredId));
  const elasticityMastery = phaseAtLeast(phase, "learn") ? 46 : 42;
  const hovered = hoveredId ? NODE_MAP[hoveredId] : null;

  return (
    <section ref={root} id="route" className="home-route-page" aria-labelledby="route-title">
      <header className="home-route-copy">
        <p className="kicker">The route</p>
        <h2 id="route-title">
          Many possible paths.
          <br />
          One next stop.
        </h2>
        <p>
          Concepts sit in a landscape. Kelus draws the line you should follow today — and redraws it when a check comes
          in weaker than expected.
        </p>
      </header>

      <div className="home-route-art">
        <KnowledgeLandscape
          layout={layout}
          phase={phase}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          elasticityMastery={elasticityMastery}
          reduceMotion={reduceMotion}
        />
        {hovered?.why ? (
          <aside className="hero-why" aria-live="polite">
            <p className="hero-why-name">{hovered.name}</p>
            <p className="hero-why-num">
              {hovered.id === "elasticity" ? elasticityMastery : hovered.mastery}% mastery
            </p>
            <p className="kicker">Why now</p>
            <p>{hovered.why.importance}</p>
            <p>{hovered.why.mastery}</p>
            <p>{hovered.why.value}</p>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
