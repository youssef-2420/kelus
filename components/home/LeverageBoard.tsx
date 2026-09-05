"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const rows = [
  {
    id: "elasticity",
    rank: "01",
    name: "Elasticity",
    note: "Low mastery · high exam value",
    signal: 82,
    priority: true,
  },
  {
    id: "markets",
    rank: "02",
    name: "Market structures",
    note: "Medium mastery · high value",
    signal: 62,
    priority: false,
  },
  {
    id: "supply",
    rank: "03",
    name: "Supply & demand",
    note: "Strong · quick retrieval only",
    signal: 28,
    priority: false,
  },
] as const;

export function LeverageBoard() {
  const reduce = useReducedMotion() === true;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const play = reduce || inView;

  return (
    <div ref={ref} className="signal-board" aria-label="Example topic priorities">
      <div className="signal-head">
        <span>Study next</span>
        <span>Already strong</span>
      </div>
      {rows.map((row, index) => (
        <motion.div
          key={row.id}
          className={`signal-row${row.priority ? " is-priority" : ""}`}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{
            duration: 0.42,
            delay: reduce ? 0 : row.priority ? 0.46 : 0.12 + (index - 1) * 0.14,
            ease,
          }}
        >
          <b>{row.rank}</b>
          <p>
            <strong>{row.name}</strong>
            <small>{row.note}</small>
          </p>
          <i>
            <motion.span
              className="signal-fill"
              initial={reduce ? false : { scaleX: 0 }}
              animate={play ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{
                duration: 0.75,
                delay: reduce ? 0 : row.priority ? 0.62 : 0.28 + (index - 1) * 0.14,
                ease,
              }}
              style={{ width: `${row.signal}%` }}
            />
          </i>
        </motion.div>
      ))}
    </div>
  );
}
