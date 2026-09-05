"use client";

import Link from "next/link";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KnowledgeLandscape } from "@/components/hero/KnowledgeLandscape";
import { NODE_MAP } from "@/components/hero/landscape-data";
import { phaseAtLeast, useHeroTimeline, type TimelineMode } from "@/components/hero/useHeroTimeline";
import { LeverageBoard } from "@/components/home/LeverageBoard";
import { TimeClaim } from "@/components/home/TimeClaim";

export type StoryChapter = "open" | "leverage" | "time" | "climax";

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useMobileLayout() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 760px)").matches,
    () => false,
  );
}

function useStoryChapter() {
  const [chapter, setChapter] = useState<StoryChapter>("open");
  const refs = useRef<Partial<Record<StoryChapter, HTMLElement | null>>>({});

  useEffect(() => {
    const nodes = (["open", "leverage", "time", "climax"] as const)
      .map((id) => refs.current[id])
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const next = visible[0]?.target.getAttribute("data-chapter") as StoryChapter | null;
        if (next) setChapter(next);
      },
      { rootMargin: "-28% 0px -42% 0px", threshold: [0, 0.2, 0.45, 0.7] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { chapter, refs };
}

export function RouteStory() {
  const reduceMotion = useReducedMotion() === true;
  const mobile = useMobileLayout();
  const layout = mobile ? "mobile" : "desktop";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.12 });
  const { chapter, refs } = useStoryChapter();
  const mode: TimelineMode = chapter === "climax" ? "climax" : "hero";
  const phase = useHeroTimeline(reduceMotion, !inView || Boolean(hoveredId), mode);
  const elasticityMastery = phaseAtLeast(phase, "learn") ? 54 : 42;
  const routed = phaseAtLeast(phase, "route");
  const updated = phase === "updated";
  const hovered = hoveredId ? NODE_MAP[hoveredId] : null;
  const focusId = chapter === "leverage" ? "elasticity" : null;

  let note = null;
  if (hovered?.why) {
    note = (
      <aside className="hero-note" aria-live="polite">
        <p className="hero-note-name">{hovered.name}</p>
        <p className="hero-note-num">{hovered.id === "elasticity" ? elasticityMastery : hovered.mastery}%</p>
        <p>{hovered.why.importance}</p>
      </aside>
    );
  } else if (chapter === "climax" && (updated || phaseAtLeast(phase, "learn"))) {
    note = (
      <aside className="hero-note is-climax" aria-live="polite">
        <p className="hero-note-name">{updated ? "Route updated" : "New evidence"}</p>
        <p className="hero-note-num">42→54</p>
        <p>{updated ? "Monetary Policy moved forward." : "Elasticity came in weaker than expected."}</p>
      </aside>
    );
  } else if (routed) {
    note = (
      <aside className="hero-note" aria-live="polite">
        <p className="hero-note-name">Elasticity</p>
        <p className="hero-note-num">42%</p>
        <p>Very high exam value</p>
        <p className="hero-note-time">45 min today</p>
      </aside>
    );
  }

  return (
    <div className="route-story">
      <div ref={stage} className="route-story-stage">
        <aside className="route-story-map" aria-hidden={false}>
          <KnowledgeLandscape
            layout={layout}
            phase={phase}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            elasticityMastery={elasticityMastery}
            reduceMotion={reduceMotion}
            focusId={focusId}
          />
          {note}
        </aside>

        <div className="route-story-rail">
          <section
            ref={(node) => {
              refs.current.open = node;
            }}
            data-chapter="open"
            className="story-chapter is-open"
            aria-labelledby="route-story-title"
          >
            <h1 id="route-story-title">
              Your learning
              <br />
              has a route.
            </h1>
            <p className="home-lede">Kelus spends the minutes you have on the highest-value next stop.</p>
            <div className="home-actions">
              <Link href="/today" className="cta home-cta">
                Build my route
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </section>

          <section
            ref={(node) => {
              refs.current.leverage = node;
            }}
            data-chapter="leverage"
            className="story-chapter is-leverage"
            aria-label="Choosing Elasticity"
          >
            <LeverageBoard />
          </section>

          <section
            ref={(node) => {
              refs.current.time = node;
            }}
            data-chapter="time"
            className="story-chapter is-time"
            aria-label="Today’s minutes"
          >
            <TimeClaim />
          </section>

          <section
            ref={(node) => {
              refs.current.climax = node;
            }}
            data-chapter="climax"
            className="story-chapter is-climax"
            aria-label="The route updates"
          >
            <p className={`story-updated${updated ? " is-on" : ""}`}>
              {updated ? "Route updated." : phaseAtLeast(phase, "learn") ? "Elasticity 42 → 54" : "The route holds."}
            </p>
          </section>
        </div>
      </div>

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

      <footer className="story-foot">
        <p>Where you are, where you need to go, how you get there.</p>
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
