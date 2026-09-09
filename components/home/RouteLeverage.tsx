"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useRef } from "react";

const rows = [
  { id: "game", name: "Game Theory", mastery: 31, fade: true, chosen: false },
  { id: "elasticity", name: "Elasticity", mastery: 48, fade: false, chosen: true },
  { id: "markets", name: "Market Structures", mastery: 61, fade: false, chosen: false },
] as const;

export function RouteLeverage() {
  const reduce = useReducedMotion() === true;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const play = reduce || inView;

  return (
    <div ref={ref} className="leverage-scene" aria-label="Kelus choosing Elasticity over a weaker topic">
      <ul>
        {rows.map((row, index) => (
          <motion.li
            key={row.id}
            className={row.chosen ? "is-chosen" : row.fade ? "is-faded" : undefined}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0 }}
            animate={play ? { opacity: row.fade ? 0.34 : 1 } : undefined}
            transition={{ duration: kelusDuration.slow, delay: reduce ? 0 : kelusDuration.instant + index * kelusDuration.micro, ease: kelusEase }}
          >
            <span>{row.name}</span>
            <b>{row.mastery}%</b>
          </motion.li>
        ))}
      </ul>
      <motion.aside
        initial={reduce ? false : { opacity: 0 }}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ duration: kelusDuration.moderate, delay: reduce ? 0 : kelusDuration.slow, ease: kelusEase }}
      >
        <p>Why Elasticity?</p>
        <p>Very high exam value</p>
        <p>Retention fading</p>
        <p>Unlocks Market Structures</p>
      </motion.aside>
    </div>
  );
}
