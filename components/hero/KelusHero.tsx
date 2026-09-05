"use client";

import Link from "next/link";
import { useInView, useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import { KnowledgeLandscape } from "./KnowledgeLandscape";
import { NODE_MAP } from "./landscape-data";
import { phaseAtLeast, useHeroTimeline } from "./useHeroTimeline";

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia("(max-width: 900px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useMobileLayout() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 900px)").matches,
    () => false,
  );
}

export function KelusHero() {
  const reduceMotion = useReducedMotion() === true;
  const mobile = useMobileLayout();
  const layout = mobile ? "mobile" : "desktop";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { amount: 0.35 });
  const phase = useHeroTimeline(reduceMotion, !inView || Boolean(hoveredId), "hero");
  const elasticityMastery = 42;
  const routed = phaseAtLeast(phase, "route");
  const hovered = hoveredId ? NODE_MAP[hoveredId] : null;

  return (
    <section ref={root} className="kelus-hero home-hero is-landscape" aria-label="Your learning has a route">
      <div className="kelus-hero-copy home-copy">
        <h1>
          Your learning
          <br />
          has a route.
        </h1>
        <p className="home-lede">Kelus figures out where your limited study time matters most.</p>
        <div className="home-actions">
          <Link href="/today" className="cta home-cta">
            Build my route
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>

      <div className="kelus-hero-art">
        <KnowledgeLandscape
          layout={layout}
          phase={phase}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          elasticityMastery={elasticityMastery}
          reduceMotion={reduceMotion}
        />
        {hovered?.why ? (
          <aside className="hero-note" aria-live="polite">
            <p className="hero-note-name">{hovered.name}</p>
            <p className="hero-note-num">{hovered.id === "elasticity" ? elasticityMastery : hovered.mastery}%</p>
            <p>{hovered.why.importance}</p>
          </aside>
        ) : routed ? (
          <aside className="hero-note" aria-live="polite">
            <p className="hero-note-name">Elasticity</p>
            <p className="hero-note-num">42%</p>
            <p>Very high exam value</p>
            <p className="hero-note-time">45 min today</p>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
