"use client";

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

export function ActiveRoute({ d, layout, variant = "old" }: Props) {
  const start = NODE_MAP.you;
  const end = NODE_MAP.target;

  return (
    <g className="hero-active-route">
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke="var(--hero-green)"
        strokeWidth={layout === "mobile" ? 2.6 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`hero-active-path hero-active-path-${variant}`}
      />
      <circle
        cx={start.x[layout]}
        cy={start.y[layout]}
        r={4.5}
        fill="var(--hero-green)"
      />
      <circle
        cx={end.x[layout]}
        cy={end.y[layout]}
        r={5.5}
        fill="var(--hero-paper)"
        stroke="var(--hero-green)"
        strokeWidth={2}
      />
    </g>
  );
}
