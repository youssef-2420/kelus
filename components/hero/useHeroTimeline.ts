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

const SEQUENCE: { phase: HeroPhase; at: number }[] = [
  { phase: "enter", at: 0 },
  { phase: "nodes", at: 500 },
  { phase: "paths", at: 1200 },
  { phase: "signals", at: 2200 },
  { phase: "route", at: 3200 },
  { phase: "learn", at: 4700 },
  { phase: "rerouting", at: 6400 },
  { phase: "updated", at: 7000 },
];

const LOOP_AT = 12800;

export function phaseAtLeast(phase: HeroPhase, min: HeroPhase) {
  return (
    SEQUENCE.findIndex((step) => step.phase === phase) >=
    SEQUENCE.findIndex((step) => step.phase === min)
  );
}

export function useHeroTimeline(reduceMotion: boolean, paused: boolean) {
  const [phase, setPhase] = useState<HeroPhase>("enter");
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
        if (elapsed >= LOOP_AT) elapsed = 0;
      }

      let next: HeroPhase = "enter";
      for (const item of SEQUENCE) {
        if (elapsed >= item.at) next = item.phase;
      }
      setPhase((current) => (current === next ? current : next));
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion]);

  return reduceMotion ? "updated" : phase;
}
