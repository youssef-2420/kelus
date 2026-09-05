"use client";

import { useEffect, useRef, useState } from "react";

export type HeroPhase =
  | "enter"
  | "nodes"
  | "paths"
  | "signals"
  | "route"
  | "learn"
  | "rerouting"
  | "updated";

const HERO_SEQUENCE: { phase: HeroPhase; at: number }[] = [
  { phase: "enter", at: 0 },
  { phase: "nodes", at: 280 },
  { phase: "paths", at: 900 },
  { phase: "signals", at: 1600 },
  { phase: "route", at: 2400 },
];

const CLIMAX_SEQUENCE: { phase: HeroPhase; at: number }[] = [
  { phase: "route", at: 0 },
  { phase: "learn", at: 1600 },
  { phase: "rerouting", at: 2800 },
  { phase: "updated", at: 3600 },
];

export function phaseAtLeast(phase: HeroPhase, min: HeroPhase) {
  const order: HeroPhase[] = ["enter", "nodes", "paths", "signals", "route", "learn", "rerouting", "updated"];
  return order.indexOf(phase) >= order.indexOf(min);
}

export function useHeroTimeline(
  reduceMotion: boolean,
  paused: boolean,
  mode: "hero" | "climax" = "hero",
) {
  const hold = mode === "hero" ? "route" : "updated";
  const sequence = mode === "hero" ? HERO_SEQUENCE : CLIMAX_SEQUENCE;
  const loopAt = mode === "hero" ? Number.POSITIVE_INFINITY : 9000;
  const initial: HeroPhase = mode === "hero" ? "enter" : "route";
  const [phase, setPhase] = useState<HeroPhase>(initial);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (reduceMotion) return;

    let elapsed = 0;
    let last = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const delta = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += delta;
        if (elapsed >= loopAt) elapsed = 0;
      }

      let next: HeroPhase = sequence[0].phase;
      for (const item of sequence) {
        if (elapsed >= item.at) next = item.phase;
      }
      setPhase((current) => (current === next ? current : next));
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, loopAt, sequence]);

  if (reduceMotion) return hold;
  return phase;
}
