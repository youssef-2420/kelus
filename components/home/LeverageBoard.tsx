"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const rows = [
  { id: "game", name: "Game Theory", mastery: 31, fade: true, chosen: false },
  { id: "elasticity", name: "Elasticity", mastery: 48, fade: false, chosen: true },
  { id: "markets", name: "Market Structures", mastery: 61, fade: false, chosen: false },
] as const;

export function LeverageBoard() {
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
            initial={reduce ? false : { opacity: 0 }}
            animate={play ? { opacity: row.fade ? 0.34 : 1 } : undefined}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.08 + index * 0.1, ease }}
          >
            <span>{row.name}</span>
            <b>{row.mastery}%</b>
          </motion.li>
        ))}
      </ul>
      <motion.aside
        initial={reduce ? false : { opacity: 0 }}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ duration: 0.4, delay: reduce ? 0 : 0.48, ease }}
      >
        <p>Why Elasticity?</p>
        <p>Very high exam value</p>
        <p>Retention fading</p>
        <p>Unlocks Market Structures</p>
      </motion.aside>
    </div>
  );
}
