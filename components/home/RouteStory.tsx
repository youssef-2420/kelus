"use client";

import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KnowledgeLandscape } from "@/components/hero/KnowledgeLandscape";
import { NODE_MAP } from "@/components/hero/landscape-data";
import { phaseAtLeast, useHeroTimeline, type TimelineMode } from "@/components/hero/useHeroTimeline";
import { RouteLeverage } from "@/components/home/RouteLeverage";
import { TimeClaim } from "@/components/home/TimeClaim";

export type StoryChapter = "open" | "leverage" | "time" | "climax";

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

function useStoryChapter() {
  const [chapter, setChapter] = useState<StoryChapter>("open");
  const refs = useRef<Partial<Record<StoryChapter, HTMLElement | null>>>({});
  const registerChapter = useCallback((id: StoryChapter, node: HTMLElement | null) => {
    refs.current[id] = node;
  }, []);

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

  return { chapter, registerChapter };
}

export function RouteStory() {
  const reduceMotion = useReducedMotion() === true;
  const mobile = useMobileLayout();
  const layout = mobile ? "mobile" : "desktop";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.12 });
  const { chapter, registerChapter } = useStoryChapter();
  const mode: TimelineMode = chapter === "climax" ? "climax" : "hero";
  const phase = useHeroTimeline(reduceMotion, !inView || Boolean(hoveredId), mode);
  const elasticityMastery = phaseAtLeast(phase, "learn") ? 54 : 42;
  const routed = phaseAtLeast(phase, "route");
  const updated = phase === "updated";
  const hovered = hoveredId ? NODE_MAP[hoveredId] : null;
  const focusId = chapter === "leverage" ? "elasticity" : null;

  const ease = [0.22, 1, 0.36, 1] as const;
  const press = { type: "spring" as const, bounce: 0, duration: 0.32 };
  let note = null;
  let noteKey = "none";
  if (hovered?.why) {
    noteKey = hovered.id;
    note = (
      <>
        <p className="hero-note-name">{hovered.name}</p>
        <p className="hero-note-num">{hovered.id === "elasticity" ? elasticityMastery : hovered.mastery}%</p>
        <p>{hovered.why.importance}</p>
      </>
    );
  } else if (chapter === "climax" && (updated || phaseAtLeast(phase, "learn"))) {
    noteKey = updated ? "updated" : "learn";
    note = (
      <>
        <p className="hero-note-name">{updated ? "Route updated" : "New evidence"}</p>
        <p className="hero-note-num">42→54</p>
        <p>{updated ? "Monetary Policy moved forward." : "Elasticity came in weaker than expected."}</p>
      </>
    );
  } else if (routed) {
    noteKey = "elasticity";
    note = (
      <>
        <p className="hero-note-name">Elasticity</p>
        <p className="hero-note-num">42%</p>
        <p>Very high exam value</p>
        <p className="hero-note-time">45 min today</p>
      </>
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
          <AnimatePresence mode="wait">
            {note ? (
              <motion.aside
                key={noteKey}
                className="hero-note"
                aria-live="polite"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.28, ease }}
              >
                {note}
              </motion.aside>
            ) : null}
          </AnimatePresence>
        </aside>

        <div className="route-story-rail">
          <section
            ref={(node) => {
              registerChapter("open", node);
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
            <p className="home-lede">Kelus figures out where your limited study time matters most.</p>
            <div className="home-actions">
              <motion.div whileTap={reduceMotion ? undefined : { scale: 0.97 }} transition={press}>
                <Link href="/today" className="cta home-cta">
                  Build my route
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </motion.div>
            </div>
          </section>

          <section
            ref={(node) => {
              registerChapter("leverage", node);
            }}
            data-chapter="leverage"
            className="story-chapter is-leverage"
            aria-label="Choosing Elasticity"
          >
            <RouteLeverage />
          </section>

          <section
            ref={(node) => {
              registerChapter("time", node);
            }}
            data-chapter="time"
            className="story-chapter is-time"
            aria-label="Today’s minutes"
          >
            <TimeClaim />
          </section>

          <section
            ref={(node) => {
              registerChapter("climax", node);
            }}
            data-chapter="climax"
            className="story-chapter is-climax"
            aria-label="The route updates"
          >
            {phaseAtLeast(phase, "learn") ? (
              <p className="story-mastery-shift" aria-hidden="true">
                <b>42</b>
                <span>→</span>
                <b>54</b>
              </p>
            ) : null}
            <p className={`story-updated${updated ? " is-on" : ""}`}>
              {updated ? "Route updated." : ""}
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
