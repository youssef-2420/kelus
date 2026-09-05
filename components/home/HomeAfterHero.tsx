"use client";

import Link from "next/link";
import { useInView, useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import { KnowledgeLandscape } from "@/components/hero/KnowledgeLandscape";
import { phaseAtLeast, useHeroTimeline } from "@/components/hero/useHeroTimeline";
import { LeverageBoard } from "@/components/home/LeverageBoard";
import { TimeClaim } from "@/components/home/TimeClaim";

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

export function HomeAfterHero() {
  const reduceMotion = useReducedMotion() === true;
  const mobile = useMobileLayout();
  const layout = mobile ? "mobile" : "desktop";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const climax = useRef<HTMLElement>(null);
  const inView = useInView(climax, { amount: 0.4 });
  const phase = useHeroTimeline(reduceMotion, !inView || Boolean(hoveredId), "climax");
  const elasticityMastery = phaseAtLeast(phase, "learn") ? 54 : 42;
  const updated = phase === "updated";

  return (
    <div className="kelus-story">
      <svg className="story-spine" viewBox="0 0 24 1400" aria-hidden="true">
        <path d="M 12 0 C 12 180, 4 320, 12 480 C 20 640, 6 820, 12 1000 C 16 1160, 12 1280, 12 1400" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>

      <section className="story-beat story-leverage" aria-label="Kelus choosing the next concept">
        <LeverageBoard />
      </section>

      <section className="story-beat story-time" aria-label="Today’s minutes">
        <TimeClaim />
      </section>

      <section ref={climax} className="story-beat story-climax" aria-label="The route updates">
        <KnowledgeLandscape
          layout={layout}
          phase={phase}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          elasticityMastery={elasticityMastery}
          reduceMotion={reduceMotion}
        />
        <p className={`story-updated${updated ? " is-on" : ""}`}>
          {updated ? (
            <>
              Route updated
              <span>Monetary Policy moved forward.</span>
            </>
          ) : phaseAtLeast(phase, "learn") ? (
            <>
              Elasticity 42 → 54
            </>
          ) : (
            <>
              New learning evidence
            </>
          )}
        </p>
      </section>

      <dl className="story-limits">
        <div>
          <dt>Not a grade prediction</dt>
          <dd>Readiness is confidence you report, weighted by exam importance.</dd>
        </div>
        <div>
          <dt>Not a content generator</dt>
          <dd>Kelus organizes your topics. It does not replace your notes.</dd>
        </div>
        <div>
          <dt>Not a streak</dt>
          <dd>Miss a day and the plan recalculates.</dd>
        </div>
      </dl>

      <footer className="home-foot">
        <h2>Where you are, where you need to go, how you get there.</h2>
        <div>
          <span className="mark">Kelus</span>
          <Link href="/today">
            Build my route <span aria-hidden="true">→</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
