"use client";

import { motion } from "motion/react";
import type { Layout } from "./landscape-data";
import { NODE_MAP } from "./landscape-data";

type Props = {
  d: string;
  layout: Layout;
  delay?: number;
  duration?: number;
  reduceMotion?: boolean;
  variant?: "old" | "new";
};

export function ActiveRoute({ d, layout, reduceMotion = false, variant = "old" }: Props) {
  const start = NODE_MAP.you;
  const end = NODE_MAP.target;
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <g className="hero-active-route">
      <path
        d={d}
        fill="none"
        stroke="#0d4640"
        strokeOpacity={0.18}
        strokeWidth={layout === "mobile" ? 10 : 14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.path
        d={d}
        pathLength={1}
        fill="none"
        stroke="#0d4640"
        strokeWidth={layout === "mobile" ? 4.4 : 5.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`hero-active-path hero-active-path-${variant}`}
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: variant === "new" ? 0.9 : 1.15, ease, delay: variant === "new" ? 0.05 : 0.12 }}
      />
      <circle
        cx={start.x[layout]}
        cy={start.y[layout]}
        r={6}
        fill="var(--hero-green)"
      />
      <circle
        cx={end.x[layout]}
        cy={end.y[layout]}
        r={7}
        fill="var(--hero-paper)"
        stroke="var(--hero-green)"
        strokeWidth={2}
      />
    </g>
  );
}
